import type { Order } from '@/lib/api/types';

/**
 * The one option on the Payment page that doesn't pay now, if any (Clarke, 2026-11-16):
 * at a table, ask for the bill after the meal; for delivery, pay when it arrives. A pickup order
 * is paid in the app, so nobody can order and walk away.
 */
export function laterOption(order: Pick<Order, 'tableCode' | 'source'>): string | null {
  if (order.tableCode) return 'payment.billLater';
  if (order.source === 'delivery') return 'payment.onDelivery';
  return null;
}
