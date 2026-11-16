import type { Order, OrderStatus } from '@/lib/api/types';

/**
 * An order placed on this phone, kept so the customer can see their past orders without an
 * account. Only what they saw on the order: never their name, phone or address (Act 843).
 */
export type PastOrder = {
  orderId: string;
  slug: string;
  venueName: string;
  number: number;
  placedAt: string;
  totalPesewas: number;
  currency: string;
  items: { name: string; quantity: number }[];
  source: Order['source'];
  /** The last status this phone saw. */
  status: OrderStatus;
};

const KEEP = 30;

export function pastOrderFrom(
  order: Order,
  slug: string,
  venueName: string,
  currency: string,
): PastOrder {
  return {
    orderId: order.id,
    slug,
    venueName,
    number: order.number,
    placedAt: order.createdAt,
    totalPesewas: order.totalPesewas,
    currency,
    items: order.lines.map((line) => ({ name: line.name, quantity: line.quantity })),
    source: order.source,
    status: order.status,
  };
}

/** Adds an order (or replaces the same one), newest first, keeping the last 30. */
export function rememberOrder(list: PastOrder[], order: PastOrder): PastOrder[] {
  return [order, ...list.filter((item) => item.orderId !== order.orderId)]
    .sort((a, b) => b.placedAt.localeCompare(a.placedAt))
    .slice(0, KEEP);
}

/** The order's latest status, as seen on its status page. Unchanged list when it isn't there. */
export function updateStatus(list: PastOrder[], orderId: string, status: OrderStatus): PastOrder[] {
  if (!list.some((item) => item.orderId === orderId && item.status !== status)) return list;
  return list.map((item) => (item.orderId === orderId ? { ...item, status } : item));
}
