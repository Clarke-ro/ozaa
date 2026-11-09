import type { OwnerDashboard } from '@/lib/api/types';

export type FigureKey = 'sales' | 'ordersToday' | 'pending' | 'visitors';

export type Figure = {
  key: FigureKey;
  /** Pesewas for sales, a count for the rest. */
  value: number;
  /** The page behind the number. */
  href: string;
};

/**
 * Today's stats row: one dark card with the day's sales, then three small cards. Sales count money
 * already taken, online or marked paid by staff. The screen turns keys into words and formats money.
 */
export function todayFigures(d: OwnerDashboard): { hero: Figure; cards: [Figure, Figure, Figure] } {
  return {
    hero: { key: 'sales', value: d.salesTodayPesewas, href: '/owner/sales' },
    cards: [
      { key: 'ordersToday', value: d.ordersToday, href: '/owner/orders' },
      { key: 'pending', value: d.pendingOrders, href: '/owner/orders' },
      { key: 'visitors', value: d.visitorsToday, href: '/owner/insights' },
    ],
  };
}
