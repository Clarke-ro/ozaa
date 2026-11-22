import { and, desc, eq, gte, inArray, lt } from 'drizzle-orm';
import type { Db } from '../db/client.ts';
import { orderLines, orders } from '../db/schema.ts';
import type { Order } from '../shared/types.ts';
import { orderFromRows } from './orderStore.ts';

const LIVE = ['received', 'accepted', 'preparing', 'ready'] as const;
type Status = (typeof LIVE)[number] | 'served' | 'cancelled';

/** At most this many orders in one reply. A poll that asks for changes comes back with far fewer. */
export const ORDER_PAGE = 300;

/**
 * The owner's order list. With no extra filters this is the newest 300, which older apps expect.
 * `live` keeps only tickets the kitchen still has. `updatedSince` keeps only what changed, so a
 * poll every few seconds does not send the whole page again.
 */
export async function listOwnerOrders(
  db: Db,
  venueId: string,
  filter: { statuses: Status[]; since?: Date; until?: Date; updatedSince?: Date; live: boolean },
): Promise<Order[]> {
  const rows = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.venueId, venueId),
        filter.statuses.length ? inArray(orders.status, filter.statuses) : undefined,
        filter.live ? inArray(orders.status, [...LIVE]) : undefined,
        filter.since ? gte(orders.createdAt, filter.since) : undefined,
        filter.until ? lt(orders.createdAt, filter.until) : undefined,
        filter.updatedSince ? gte(orders.updatedAt, filter.updatedSince) : undefined,
      ),
    )
    .orderBy(filter.updatedSince ? desc(orders.updatedAt) : desc(orders.createdAt))
    .limit(ORDER_PAGE);
  if (rows.length === 0) return [];
  const lines = await db
    .select()
    .from(orderLines)
    .where(
      inArray(
        orderLines.orderId,
        rows.map((row) => row.id),
      ),
    );
  const byOrder = new Map<string, typeof lines>();
  for (const line of lines) {
    const list = byOrder.get(line.orderId);
    if (list) list.push(line);
    else byOrder.set(line.orderId, [line]);
  }
  return rows.map((row) => orderFromRows(row, byOrder.get(row.id) ?? []));
}
