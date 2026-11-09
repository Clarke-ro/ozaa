import type { TFunction } from 'i18next';
import type { Order } from '@/lib/api/types';
import type { PillTone } from '../../kit';

/** Pill colour for how long a live ticket has waited (tones from ticketAge in desk/ops). */
export const AGE_TONE = { ok: 'neutral', late: 'waiting', very_late: 'error' } as const;

/**
 * Where an order goes, in words ("Table 3", "Pickup for Kofi") and as the short code on its tile
 * ("3", "PU"). Table orders show the table; menu-link orders say pickup or delivery, and who for.
 */
export function orderPlace(order: Order, t: TFunction): { where: string; tile: string } {
  const where = order.tableCode
    ? t('ownerOrders.table', { code: order.tableCode })
    : order.source === 'delivery' || order.source === 'pickup'
      ? order.contact
        ? t(`ownerOrders.source.${order.source}For`, { name: order.contact.name })
        : t(`ownerOrders.source.${order.source}`)
      : t('ownerOrders.takeaway');
  const tile =
    order.tableCode ??
    (order.source === 'delivery'
      ? t('ownerOrders.source.deliveryCode')
      : order.source === 'pickup'
        ? t('ownerOrders.source.pickupCode')
        : t('ownerOrders.takeawayCode'));
  return { where, tile };
}

/** "6 min", "Just now" or "2 h", for how long a live ticket has waited. */
export function waitedLabel(minutes: number, t: TFunction): string {
  if (minutes === 0) return t('ownerOrders.justNow');
  if (minutes < 60) return t('ownerOrders.waited', { count: minutes });
  return t('ownerOrders.waitedHours', { count: Math.floor(minutes / 60) });
}

/** Pill colour for an order's stage, once it has left the live tabs. */
export const STATUS_TONE: Record<Order['status'], PillTone> = {
  received: 'waiting',
  preparing: 'accent',
  ready: 'success',
  served: 'neutral',
  cancelled: 'error',
};

/** Pill colour for how much of an order is paid. */
export const PAID_TONE: Record<Order['paymentStatus'], PillTone> = {
  unpaid: 'neutral',
  part_paid: 'waiting',
  paid: 'success',
  refunded: 'neutral',
};

/** "Paid online", "Paid · Cash" or "Not paid", so staff know whether the money is already in. */
export function paidLabel(order: Order, t: TFunction): string {
  if (order.paymentStatus === 'paid' && order.paymentMethod) {
    return order.paymentMethod.startsWith('online')
      ? t('ownerOrders.paid.online')
      : t('ownerOrders.paid.by', { method: t(`ownerOrders.method.${order.paymentMethod}`) });
  }
  return t(`ownerOrders.paid.${order.paymentStatus}`);
}
