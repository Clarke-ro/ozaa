import type { Order } from '@/lib/api/types';

/** The guest's four steps. The last one is worded by finishWord (served, picked up, delivered). */
export const TIMELINE = ['accepted', 'preparing', 'ready', 'served'] as const;
export type TimelineState = 'done' | 'next' | 'todo';

/**
 * Each step's state for an order's status. A step is ticked the moment staff mark it, so the
 * guest is never a step behind the owner app (Clarke, 2026-11-17), and the step after it is
 * highlighted as what happens next. A new order (received) has nothing ticked yet.
 */
export function timelineSteps(status: Order['status']): TimelineState[] {
  const reached = TIMELINE.indexOf(status as (typeof TIMELINE)[number]);
  return TIMELINE.map((_, index) =>
    index <= reached ? 'done' : index === reached + 1 ? 'next' : 'todo',
  );
}

/**
 * How an order ends, for its last step, its status and the staff button: served at a table,
 * picked up for pickup, delivered for delivery. The status stays `served` in the API; only the
 * words change. Delivery tracking (drivers, the map) comes later.
 */
export function finishWord(source: Order['source']): 'served' | 'pickedUp' | 'delivered' {
  if (source === 'pickup') return 'pickedUp';
  if (source === 'delivery') return 'delivered';
  return 'served';
}

/** The i18n key for an order's status in words: "Served" becomes "Picked up" or "Delivered". */
export function statusKey(order: Pick<Order, 'status' | 'source'>): string {
  return order.status === 'served'
    ? `statusLabel.${finishWord(order.source)}`
    : `statusLabel.${order.status}`;
}
