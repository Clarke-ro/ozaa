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

const keys = (figures: { key: string }[]) => figures.map((f) => f.key);

test('with payments on, sales is the dark card and three small cards follow it', () => {
  const { hero, cards } = todayFigures(base, { payments: true });
  expect(hero).toEqual({ key: 'sales', value: 125_000, href: '/owner/sales' });
  expect(keys(cards)).toEqual(['ordersToday', 'pending', 'visitors']);
});

test('with payments off, orders today is the dark card and sales is not shown at all', () => {
  const { hero, cards } = todayFigures(base, { payments: false });
  expect(hero).toEqual({ key: 'ordersToday', value: 14, href: '/owner/orders' });
  expect(keys(cards)).toEqual(['pending', 'visitors', 'tables']);
  expect(keys([hero, ...cards])).not.toContain('sales');
});

test('there are always exactly three small cards, so the row never has a gap', () => {
  for (const payments of [true, false]) {
    expect(todayFigures(base, { payments }).cards).toHaveLength(3);
  }
});

test('each card carries its number from the dashboard and opens the page behind it', () => {
  const { cards } = todayFigures(base, { payments: false });
  expect(cards).toEqual([
    { key: 'pending', value: 2, href: '/owner/orders' },
    { key: 'visitors', value: 40, href: '/owner/insights' },
    { key: 'tables', value: 5, href: '/owner/floor' },
  ]);
});
