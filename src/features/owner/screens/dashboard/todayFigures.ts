import type { OwnerDashboard } from '@/lib/api/types';

export type FigureKey = 'sales' | 'ordersToday' | 'pending' | 'visitors' | 'tables';

export type Figure = {
  key: FigureKey;
  /** Pesewas for sales, a count for the rest. */
  value: number;
  /** The page behind the number. */
  href: string;
};

/**
 * Today's stats row: one dark card with the day's main number, then three small cards. Sales
 * only mean something when the app takes payments, so without payments the day's order count
 * takes the dark card and tables seated fills the third small card, keeping the row at three.
 * The screen turns keys into words and formats the money.
 */
export function todayFigures(
  d: OwnerDashboard,
  opts: { payments: boolean },
): { hero: Figure; cards: [Figure, Figure, Figure] } {
  const ordersToday: Figure = { key: 'ordersToday', value: d.ordersToday, href: '/owner/orders' };
  const pending: Figure = { key: 'pending', value: d.pendingOrders, href: '/owner/orders' };
  const visitors: Figure = { key: 'visitors', value: d.visitorsToday, href: '/owner/insights' };
  if (!opts.payments) {
    const tables: Figure = { key: 'tables', value: d.openTables, href: '/owner/floor' };
    return { hero: ordersToday, cards: [pending, visitors, tables] };
  }
  return {
    hero: { key: 'sales', value: d.salesTodayPesewas, href: '/owner/sales' },
    cards: [ordersToday, pending, visitors],
  };
}
