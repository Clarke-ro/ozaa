import type { OwnerDashboard } from '@/lib/api/types';

export type FigureKey = 'sales' | 'ordersToday' | 'visitors' | 'tables' | 'rating';

export type Figure = {
  key: FigureKey;
  /** Pesewas for sales, the average for rating (null with no ratings), a count for the rest. */
  value: number | null;
  /** The page behind the number. */
  href: string;
};

/**
 * Today's numbers: one big figure and a short line of smaller ones under it. Sales only mean
 * something when the app takes payments, so without payments the day's order count is the big
 * figure instead. Pending orders and waiter calls are not here on purpose: Live orders and
 * Needs you already show them, and two counts from two queries can briefly disagree.
 * The screen turns keys into words and formats the money.
 */
export function todayFigures(
  d: OwnerDashboard,
  opts: { payments: boolean },
): { hero: Figure; line: Figure[] } {
  const ordersToday: Figure = { key: 'ordersToday', value: d.ordersToday, href: '/owner/orders' };
  const line: Figure[] = [
    { key: 'visitors', value: d.visitorsToday, href: '/owner/insights' },
    { key: 'tables', value: d.openTables, href: '/owner/floor' },
    { key: 'rating', value: d.ratingAverage, href: '/owner/reviews' },
  ];
  if (!opts.payments) return { hero: ordersToday, line };
  return {
    hero: { key: 'sales', value: d.salesTodayPesewas, href: '/owner/insights' },
    line: [ordersToday, ...line],
  };
}
