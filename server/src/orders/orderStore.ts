import { randomUUID } from 'node:crypto';
import { and, asc, eq, max, sql } from 'drizzle-orm';
import type { Db } from '../db/client.ts';
import { idempotencyKeys, menuItems, orderLines, orders } from '../db/schema.ts';
import { Problem } from '../http/problem.ts';
import type { Order } from '../shared/types.ts';
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

/**
 * Saves a priced order in one transaction: the next daily number, its lines, and the stock it
 * takes. `clientOrderId` makes a retry return the first order instead of a second one.
 */
export async function saveOrder(
  db: Db,
  input: {
    venueId: string;
    guestSessionId: string;
    clientOrderId: string;
    tableCode: string | null;
    priced: PricedOrder;
    now: number;
  },
): Promise<Order> {
  const scope = `order:${input.guestSessionId}`;
  const orderId = await db.transaction(async (tx) => {
    const [seen] = await tx
      .select()
      .from(idempotencyKeys)
      .where(and(eq(idempotencyKeys.scope, scope), eq(idempotencyKeys.key, input.clientOrderId)));
    if (seen) return (seen.body as { orderId: string }).orderId;

    // Take the stock first: the update only matches while enough is left, so two guests can't
    // both get the last portion.
    for (const [itemId, quantity] of input.priced.stock) {
      const taken = await tx
        .update(menuItems)
        .set({
          stockCount: sql`case when ${menuItems.stockCount} is null then null else ${menuItems.stockCount} - ${quantity} end`,
          available: sql`case when ${menuItems.stockCount} is null then ${menuItems.available} else ${menuItems.stockCount} - ${quantity} > 0 end`,
        })
        .where(and(eq(menuItems.id, itemId), sql`(${menuItems.stockCount} is null or ${menuItems.stockCount} >= ${quantity})`))
        .returning({ id: menuItems.id });
      if (taken.length === 0) throw new Problem(422, 'item_sold_out', 'Something in your order just sold out.');
    }

    // Order numbers start again each day in the venue's time zone. Ghana is UTC all year.
    const businessDay = new Date(input.now).toISOString().slice(0, 10);
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
    await tx.insert(idempotencyKeys).values({ scope, key: input.clientOrderId, status: 201, body: { orderId: id } });
    return id;
  });
  const saved = await orderById(db, orderId);
  if (!saved) throw new Problem(404, 'order_not_found', 'Order not found.');
  return saved.order;
}
