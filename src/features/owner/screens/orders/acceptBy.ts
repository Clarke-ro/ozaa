import type { Order } from '@/lib/api/types';

export type AcceptLeft = { kind: 'left'; minutes: number } | { kind: 'now' } | { kind: 'late' };

const MINUTE = 60_000;

/**
 * How long staff have to accept an order from an outside channel (Order.acceptBy). Chowdeck
 * rejects an order nobody accepts in time and refunds the customer, so a new ticket counts down.
 * Whole minutes, rounded up, because the board ticks every 30 s; under a minute it says now.
 */
export function acceptLeft(
  order: Pick<Order, 'status'> & Partial<Pick<Order, 'acceptBy'>>,
  now: number,
): AcceptLeft | null {
  if (order.status !== 'received' || !order.acceptBy) return null;
  const left = Date.parse(order.acceptBy) - now;
  if (left <= 0) return { kind: 'late' };
  if (left < MINUTE) return { kind: 'now' };
  return { kind: 'left', minutes: Math.ceil(left / MINUTE) };
}
