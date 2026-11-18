import { and, asc, eq, inArray, isNull, lt, sql } from 'drizzle-orm';
import type { Db } from '../db/client.ts';
import { menuItems, orderLines, orders, promos } from '../db/schema.ts';
import { Problem } from '../http/problem.ts';
import type { AppliedPromo } from '../shared/types.ts';

/**
 * How long a guest order can sit unaccepted and unpaid before its dish and promo go back.
 * Long enough for a waiter to accept it. Short enough that a script can't sell a dish out
 * for the whole service. Staff orders are left alone: a waiter typed those in.
 */
export const UNPAID_HOLD_MS = 30 * 60_000;

/**
 * Unaccepted unpaid orders one guest visit may have open at once. Staff orders are not counted.
 * Matches the 20 orders a visit may place in 10 minutes, so that burst still works. A later
 * wave, after that window, is refused while these are still waiting.
 */
export const MAX_OPEN_UNPAID_ORDERS = 20;

const EXPIRED_REASON = "The kitchen didn't accept this in time.";
// One request releases at most this many, oldest first. The next menu or kitchen poll continues.
const RELEASE_BATCH = 100;

/** The transaction handle. It can run the same statements as the database. */
export type OrderConn = Pick<Db, 'execute' | 'insert' | 'select' | 'update'>;

function sortedIds(quantities: Map<string, number>): string[] {
  return [...quantities.keys()].sort();
}

/** Takes each dish while enough is left, so two orders can't both get the last portion. */
export async function takeStock(tx: OrderConn, stock: Map<string, number>): Promise<void> {
  for (const itemId of sortedIds(stock)) {
    const quantity = stock.get(itemId) ?? 0;
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
}

/**
 * Counts the promo only while a use is left. The check and the increment are one update, so two
 * orders priced a moment apart can't both take the last "first 50".
 */
export async function claimPromos(tx: OrderConn, applied: readonly AppliedPromo[]): Promise<void> {
  const promosInOrder = [...applied].sort((a, b) => a.promoId.localeCompare(b.promoId));
  for (const promo of promosInOrder) {
    const claimed = await tx
      .update(promos)
      .set({
        usageCount: sql`${promos.usageCount} + 1`,
        discountGivenPesewas: sql`${promos.discountGivenPesewas} + ${promo.pesewas}`,
      })
      .where(
        and(
          eq(promos.id, promo.promoId),
          sql`${promos.usageCount} < coalesce((${promos.rule}->>'usageLimit')::integer, 2147483647)`,
        ),
      )
      .returning({ id: promos.id });
    if (claimed.length === 0) throw new Problem(422, 'promo_not_valid', 'That offer just ran out.');
  }
}

/** Gives back the dishes and promo uses this order took. Safe to call once the hold is claimed. */
export async function restoreInventory(tx: OrderConn, orderId: string): Promise<void> {
  const lines = await tx
    .select({ menuItemId: orderLines.menuItemId, quantity: orderLines.quantity })
    .from(orderLines)
    .where(eq(orderLines.orderId, orderId));
  const quantities = new Map<string, number>();
  for (const line of lines) quantities.set(line.menuItemId, (quantities.get(line.menuItemId) ?? 0) + line.quantity);
  for (const itemId of sortedIds(quantities)) {
    const quantity = quantities.get(itemId) ?? 0;
    await tx
      .update(menuItems)
      .set({
        stockCount: sql`case when ${menuItems.stockCount} is null then null else ${menuItems.stockCount} + ${quantity} end`,
        available: sql`case when ${menuItems.stockCount} is null then ${menuItems.available} else ${menuItems.stockCount} + ${quantity} > 0 end`,
      })
      .where(eq(menuItems.id, itemId));
  }
  const [order] = await tx.select({ promoDiscounts: orders.promoDiscounts }).from(orders).where(eq(orders.id, orderId));
  const discounts = (order?.promoDiscounts ?? []) as AppliedPromo[];
  for (const promo of [...discounts].sort((a, b) => a.promoId.localeCompare(b.promoId))) {
    await tx
      .update(promos)
      .set({
        usageCount: sql`greatest(0, ${promos.usageCount} - 1)`,
        discountGivenPesewas: sql`greatest(0, ${promos.discountGivenPesewas} - ${promo.pesewas})`,
      })
      .where(eq(promos.id, promo.promoId));
  }
}

/**
 * Guest orders still in `received` with no money and no payment in progress. A Paystack charge
 * that hasn't finished blocks this, so a late success still finds the dish reserved. Paystack
 * itself is never called here.
 */
function expiredHolds(venueId: string, now: number) {
  return and(
    eq(orders.venueId, venueId),
    eq(orders.status, 'received'),
    eq(orders.paidPesewas, 0),
    isNull(orders.inventoryReleasedAt),
    lt(orders.createdAt, new Date(now - UNPAID_HOLD_MS)),
    sql`(${orders.guestSessionId} is null or ${orders.guestSessionId} not like 'staff:%')`,
    sql`not exists (
      select 1 from "payments"
      where "payments"."order_id" = ${orders.id}
        and "payments"."status" in ('pending', 'pay_offline', 'open_url', 'succeeded')
    )`,
  );
}

/** Cancels this venue's expired unpaid holds and gives their dishes and promos back. */
export async function releaseExpiredHolds(db: Db, now: number, venueId: string): Promise<void> {
  const due = expiredHolds(venueId, now);
  const [hit] = await db.select({ id: orders.id }).from(orders).where(due).limit(1);
  if (!hit) return;
  const at = new Date(now);
  await db.transaction(async (tx) => {
    const ids = await tx
      .select({ id: orders.id })
      .from(orders)
      .where(due)
      .orderBy(asc(orders.createdAt))
      .limit(RELEASE_BATCH);
    if (ids.length === 0) return;
    const expired = await tx
      .update(orders)
      .set({
        status: 'cancelled',
        cancelReason: EXPIRED_REASON,
        updatedAt: at,
        inventoryReleasedAt: at,
      })
      .where(
        and(
          due,
          inArray(
            orders.id,
            ids.map((row) => row.id),
          ),
        ),
      )
      .returning({ id: orders.id });
    for (const row of expired) await restoreInventory(tx, row.id);
  });
}
