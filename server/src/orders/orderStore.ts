import { randomUUID } from 'node:crypto';
import { and, asc, count, eq, isNull, max, sql } from 'drizzle-orm';
import type { Db } from '../db/client.ts';
import { idempotencyKeys, orderLines, orders } from '../db/schema.ts';
import { Problem } from '../http/problem.ts';
import type { Order } from '../shared/types.ts';
import { claimPromos, MAX_OPEN_UNPAID_ORDERS, releaseExpiredHolds, restoreInventory, takeStock } from './orderInventory.ts';
import { retryOnDailyNumberCollision } from './orderNumber.ts';
import type { PricedOrder } from './priceOrder.ts';

type OrderRow = typeof orders.$inferSelect;
type LineRow = typeof orderLines.$inferSelect;

/** unpaid → part_paid → paid, from the food paid off so far (tips and fees never count). */
function paymentStatus(row: Pick<OrderRow, 'paidPesewas' | 'totalPesewas'>): Order['paymentStatus'] {
  if (row.paidPesewas <= 0) return 'unpaid';
  return row.paidPesewas >= row.totalPesewas ? 'paid' : 'part_paid';
}

export function orderFromRows(row: OrderRow, lines: LineRow[]): Order {
  return {
    id: row.id,
    number: row.number,
    venueId: row.venueId,
    tableCode: row.tableCode,
    status: row.status,
    paymentStatus: paymentStatus(row),
    lines: lines
      .sort((a, b) => a.position - b.position)
      .map((line) => ({
        id: line.id,
        menuItemId: line.menuItemId,
        name: line.name,
        quantity: line.quantity,
        modifiers: line.modifiers as Order['lines'][number]['modifiers'],
        unitPricePesewas: line.unitPricePesewas,
        totalPesewas: line.totalPesewas,
        ...(line.note ? { note: line.note } : {}),
        paid: line.paid,
        ...(line.discountPesewas ? { discountPesewas: line.discountPesewas } : {}),
      })),
    subtotalPesewas: row.subtotalPesewas,
    taxes: row.taxes as Order['taxes'],
    totalPesewas: row.totalPesewas,
    paidPesewas: row.paidPesewas,
    source: row.source,
    paymentMethod: (row.paymentMethod as Order['paymentMethod']) ?? null,
    contact: (row.contact as Order['contact']) ?? null,
    deliveryAddress: row.deliveryAddress,
    deliveryFeePesewas: row.deliveryFeePesewas,
    etaMinutes: row.etaMinutes,
    promoDiscounts: row.promoDiscounts as Order['promoDiscounts'],
    cancelReason: row.cancelReason,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    readyAt: row.readyAt?.toISOString() ?? null,
    servedAt: row.servedAt?.toISOString() ?? null,
  };
}

export async function orderById(db: Db, orderId: string): Promise<{ order: Order; row: OrderRow } | null> {
  const [row] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!row) return null;
  const lines = await db.select().from(orderLines).where(eq(orderLines.orderId, orderId)).orderBy(asc(orderLines.position));
  return { order: orderFromRows(row, lines), row };
}

type SaveInput = {
  venueId: string;
  /** The guest's loyalty card here, if they ordered with their loyalty token. */
  loyaltyMemberId?: string | null;
  guestSessionId: string;
  clientOrderId: string;
  tableCode: string | null;
  priced: PricedOrder;
  now: number;
};

/**
 * Saves a priced order: the next daily number, its lines, and the stock and promo it holds.
 * `clientOrderId` makes a retry return the first order instead of a second one. The hold is
 * given back on cancel, or when an unpaid guest order expires. Paystack is not called here.
 */
export async function saveOrder(db: Db, input: SaveInput): Promise<Order> {
  // Free expired holds before this order takes anything, and commit that on its own. A number
  // clash retries the insert below, and that retry must not undo a hold that already expired.
  await releaseExpiredHolds(db, input.now, input.venueId);
  const orderId = await retryOnDailyNumberCollision(() => insertOrder(db, input));
  const saved = await orderById(db, orderId);
  if (!saved) throw new Problem(404, 'order_not_found', 'Order not found.');
  return saved.order;
}

async function insertOrder(db: Db, input: SaveInput): Promise<string> {
  const scope = `order:${input.guestSessionId}`;
  return db.transaction(async (tx) => {
    const [seen] = await tx
      .select()
      .from(idempotencyKeys)
      .where(and(eq(idempotencyKeys.scope, scope), eq(idempotencyKeys.key, input.clientOrderId)));
    if (seen) return (seen.body as { orderId: string }).orderId;

    // One order at a time for this venue today. That makes the daily number and the open-order
    // cap exact, and stock updates can't deadlock by locking dishes in different orders.
    // A clash on the unique index still retries the whole insert.
    const businessDay = new Date(input.now).toISOString().slice(0, 10);
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`${input.venueId}:${businessDay}`}))`);
    if (!input.guestSessionId.startsWith('staff:')) {
      const [{ n } = { n: 0 }] = await tx
        .select({ n: count() })
        .from(orders)
        .where(and(eq(orders.guestSessionId, input.guestSessionId), eq(orders.status, 'received'), eq(orders.paidPesewas, 0)));
      if (n >= MAX_OPEN_UNPAID_ORDERS) {
        throw new Problem(429, 'too_many_open_orders', 'You already have a few orders waiting. Ask a waiter if one of them is yours.');
      }
    }
    await takeStock(tx, input.priced.stock);
    const [last] = await tx
      .select({ n: max(orders.number) })
      .from(orders)
      .where(and(eq(orders.venueId, input.venueId), eq(orders.businessDay, businessDay)));
    const id = `ord_${randomUUID().replaceAll('-', '')}`;
    const at = new Date(input.now);
    const p = input.priced;
    await tx.insert(orders).values({
      id,
      venueId: input.venueId,
      number: (last?.n ?? 0) + 1,
      businessDay,
      tableCode: input.tableCode,
      source: p.source,
      status: 'received',
      subtotalPesewas: p.subtotalPesewas,
      taxes: p.taxes,
      promoDiscounts: p.promoDiscounts,
      deliveryFeePesewas: p.deliveryFeePesewas,
      totalPesewas: p.totalPesewas,
      contact: p.contact,
      deliveryAddress: p.deliveryAddress,
      etaMinutes: p.etaMinutes,
      guestSessionId: input.guestSessionId,
      loyaltyMemberId: input.loyaltyMemberId ?? null,
      createdAt: at,
      updatedAt: at,
    });
    await tx.insert(orderLines).values(
      p.lines.map((line, position) => ({
        id: line.id,
        orderId: id,
        position,
        menuItemId: line.menuItemId,
        name: line.name,
        quantity: line.quantity,
        modifiers: line.modifiers ?? [],
        unitPricePesewas: line.unitPricePesewas,
        totalPesewas: line.totalPesewas,
        discountPesewas: line.discountPesewas ?? 0,
        note: line.note ?? null,
      })),
    );
    await claimPromos(tx, p.promoDiscounts);
    await tx.insert(idempotencyKeys).values({ scope, key: input.clientOrderId, status: 201, body: { orderId: id } });
    return id;
  });
}

/**
 * Cancels an order and gives its dish and promo back, once. The status check is the same
 * optimistic lock as the other moves, so two staff can't both cancel it.
 */
export async function cancelOrder(
  db: Db,
  input: { id: string; fromStatus: Order['status']; reason: string | null; now: number },
): Promise<Order | null> {
  const at = new Date(input.now);
  const released = await db.transaction(async (tx) => {
    const [moved] = await tx
      .update(orders)
      .set({ status: 'cancelled', cancelReason: input.reason, updatedAt: at, inventoryReleasedAt: at })
      .where(and(eq(orders.id, input.id), eq(orders.status, input.fromStatus), isNull(orders.inventoryReleasedAt)))
      .returning({ id: orders.id });
    if (!moved) return false;
    await restoreInventory(tx, input.id);
    return true;
  });
  if (!released) return null;
  return (await orderById(db, input.id))?.order ?? null;
}
