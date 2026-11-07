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

test('with payments on, sales is the big figure and orders today leads the line under it', () => {
  const { hero, line } = todayFigures(base, { payments: true });
  expect(hero).toEqual({ key: 'sales', value: 125_000, href: '/owner/insights' });
  expect(keys(line)).toEqual(['ordersToday', 'visitors', 'tables', 'rating']);
});

test('with payments off, orders today is the big figure and sales is not shown at all', () => {
  const { hero, line } = todayFigures(base, { payments: false });
  expect(hero).toEqual({ key: 'ordersToday', value: 14, href: '/owner/orders' });
  expect(keys(line)).toEqual(['visitors', 'tables', 'rating']);
  expect(keys([hero, ...line])).not.toContain('sales');
});

test('pending orders and waiter calls are left out, because Live orders and Needs you show them', () => {
  for (const payments of [true, false]) {
    const { hero, line } = todayFigures(base, { payments });
    expect(keys([hero, ...line])).not.toContain('pending');
    expect(keys([hero, ...line])).not.toContain('calls');
  }
});

test('rating carries null when there are no ratings yet, never a made-up zero', () => {
  const rated = todayFigures(base, { payments: true }).line.find((f) => f.key === 'rating');
  expect(rated).toEqual({ key: 'rating', value: 4.6, href: '/owner/reviews' });

  const none = todayFigures({ ...base, ratingAverage: null, ratingCount: 0 }, { payments: true });
  expect(none.line.find((f) => f.key === 'rating')?.value).toBeNull();
});

test('each figure opens the page behind it', () => {
  const { line } = todayFigures(base, { payments: true });
  expect(Object.fromEntries(line.map((f) => [f.key, f.href]))).toEqual({
    ordersToday: '/owner/orders',
    visitors: '/owner/insights',
    tables: '/owner/floor',
    rating: '/owner/reviews',
  });
});
