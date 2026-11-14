import type { WaiterCall } from '@/lib/api/types';

export type CallColumn = WaiterCall['status'];

/** The board's three columns, left to right. */
export const CALL_COLUMNS: readonly CallColumn[] = ['open', 'acknowledged', 'resolved'];

/**
 * Calls split by where they are. Waiting and On the way run oldest first (that guest has waited
 * longest); Done runs newest first, like a history.
 */
export function callBoard(calls: readonly WaiterCall[]): Record<CallColumn, WaiterCall[]> {
  const oldestFirst = [...calls].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return {
    open: oldestFirst.filter((c) => c.status === 'open'),
    acknowledged: oldestFirst.filter((c) => c.status === 'acknowledged'),
    resolved: oldestFirst.filter((c) => c.status === 'resolved').reverse(),
  };
}

/** What guests ask for most. A tie goes to the reason asked for most recently. Null with no calls. */
export function topReason(calls: readonly WaiterCall[]): WaiterCall['reason'] | null {
  const tally = new Map<WaiterCall['reason'], { count: number; last: string }>();
  for (const call of calls) {
    const seen = tally.get(call.reason);
    tally.set(call.reason, {
      count: (seen?.count ?? 0) + 1,
      last: !seen || call.createdAt > seen.last ? call.createdAt : seen.last,
    });
  }
  let best: { reason: WaiterCall['reason']; count: number; last: string } | null = null;
  for (const [reason, { count, last }] of tally) {
    if (!best || count > best.count || (count === best.count && last > best.last)) {
      best = { reason, count, last };
    }
  }
  return best?.reason ?? null;
}

/** Whole minutes from the call to someone picking it up, and to it being done. Null if not yet. */
export function callTimes(call: Pick<WaiterCall, 'createdAt' | 'acknowledgedAt' | 'resolvedAt'>): {
  pickedUp: number | null;
  done: number | null;
} {
  const from = Date.parse(call.createdAt);
  const mins = (at?: string | null) =>
    at ? Math.max(0, Math.floor((Date.parse(at) - from) / 60_000)) : null;
  return { pickedUp: mins(call.acknowledgedAt), done: mins(call.resolvedAt) };
}

const REASONS: readonly WaiterCall['reason'][] = [
  'water',
  'bill',
  'cutlery',
  'order_more',
  'clean_table',
  'other',
];

/** How many calls of each kind came in, every reason listed (canvas "Today by reason"). */
export function reasonCounts(
  calls: readonly Pick<WaiterCall, 'reason'>[],
): { reason: WaiterCall['reason']; count: number }[] {
  return REASONS.map((reason) => ({
    reason,
    count: calls.filter((c) => c.reason === reason).length,
  }));
}
