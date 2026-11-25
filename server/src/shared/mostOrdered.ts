// Generated from src/lib/mostOrdered.ts by scripts/sync-server-shared.mjs. Do not edit here.
import type { Order } from './types.ts';

/**
 * "Most ordered" on the guest menu (BUILD.md 5b.6b): the dishes guests actually ordered most,
 * from real sales, not the owner's Popular badge. The mock and the server share this rule.
 */

/** Look back 30 days, so the row follows what sells now, not last season. */
export const MOST_ORDERED_SINCE_MS = 30 * 24 * 60 * 60 * 1000;
/** The row holds at most five dishes. */
export const MOST_ORDERED_MAX = 5;
/** Fewer than three looks thin, so the guest menu shows the row only from three dishes. */
export const MOST_ORDERED_MIN = 3;

/** True when this order counts: placed in the last 30 days and not cancelled. */
export function countsForMostOrdered(
  order: Pick<Order, 'status' | 'createdAt'>,
  now: number,
): boolean {
  return order.status !== 'cancelled' && Date.parse(order.createdAt) >= now - MOST_ORDERED_SINCE_MS;
}

/**
 * The dish ids ordered most, by total quantity, top five. Ties go by id, so the row doesn't
 * shuffle between visits. Dishes no longer on the guest menu are left out.
 */
export function mostOrdered(
  lines: readonly { menuItemId: string; quantity: number }[],
  onMenu: (menuItemId: string) => boolean,
): string[] {
  const totals = new Map<string, number>();
  for (const line of lines) {
    if (!onMenu(line.menuItemId)) continue;
    totals.set(line.menuItemId, (totals.get(line.menuItemId) ?? 0) + line.quantity);
  }
  return [...totals]
    .sort(([a, x], [b, y]) => y - x || (a < b ? -1 : a > b ? 1 : 0))
    .slice(0, MOST_ORDERED_MAX)
    .map(([id]) => id);
}
