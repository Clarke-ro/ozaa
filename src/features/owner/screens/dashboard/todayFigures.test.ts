import type { OwnerDashboard } from '@/lib/api/types';
import { todayFigures } from './todayFigures';

const base: OwnerDashboard = {
  salesTodayPesewas: 125_000,
  ordersToday: 14,
  pendingOrders: 2,
  visitorsToday: 40,
  currency: 'GHS',
  changePercent: null,
  direction: 'none',
  openTables: 5,
  liveOrders: 3,
  openCalls: 1,
  ratingAverage: 4.6,
  ratingCount: 12,
  alerts: [],
};

test('sales is the dark card and three small cards follow it', () => {
  const { hero, cards } = todayFigures(base);
  expect(hero).toEqual({ key: 'sales', value: 125_000, href: '/owner/sales' });
  expect(cards).toEqual([
    { key: 'ordersToday', value: 14, href: '/owner/orders' },
    { key: 'pending', value: 2, href: '/owner/orders' },
    { key: 'visitors', value: 40, href: '/owner/insights' },
  ]);
});
