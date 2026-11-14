import type { Order } from '@/lib/api/types';
import { orderTab } from './ops';

/** The chips above Orders: everything still in the kitchen, done, turned away, or all. */
export type OrderFilter = 'open' | 'served' | 'rejected' | 'all';
export const ORDER_FILTERS: readonly OrderFilter[] = ['open', 'served', 'rejected', 'all'];

/** The board's three columns, in the order a ticket moves through them. */
export type BoardColumn = 'new' | 'cooking' | 'ready';
export const BOARD_COLUMNS: readonly BoardColumn[] = ['new', 'cooking', 'ready'];

/** A route param is a board column ("new", "cooking", "ready"), or not. */
export function isBoardColumn(value: unknown): value is BoardColumn {
  return typeof value === 'string' && (BOARD_COLUMNS as readonly string[]).includes(value);
}

export function inFilter(status: Order['status'], filter: OrderFilter): boolean {
  if (filter === 'all') return true;
  const tab = orderTab(status);
  if (filter === 'open') return tab === 'new' || tab === 'cooking' || tab === 'ready';
  return tab === filter;
}

export function filterCounts(
  orders: readonly Pick<Order, 'status'>[],
): Record<OrderFilter, number> {
  const counts: Record<OrderFilter, number> = { open: 0, served: 0, rejected: 0, all: 0 };
  for (const o of orders) {
    for (const f of ORDER_FILTERS) if (inFilter(o.status, f)) counts[f] += 1;
  }
  return counts;
}

/** Live tickets split by column, oldest first: whoever has waited longest is at the top. */
export function boardColumns<T extends Pick<Order, 'status' | 'createdAt'>>(
  orders: readonly T[],
): Record<BoardColumn, T[]> {
  const cols: Record<BoardColumn, T[]> = { new: [], cooking: [], ready: [] };
  const sorted = [...orders].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const o of sorted) {
    const tab = orderTab(o.status);
    if (tab === 'new' || tab === 'cooking' || tab === 'ready') cols[tab].push(o);
  }
  return cols;
}
