import { insightsReport, rangeWindow } from './insights';

const tz = 'Africa/Accra';
const order = (createdAt: string, total = 1000, status: 'served' | 'cancelled' = 'served') => ({
  createdAt,
  status,
  totalPesewas: total,
  lines: [{ name: 'Jollof', quantity: 1, totalPesewas: total }],
});

test('range windows end now and start at the venue midnight for today', () => {
  const now = Date.parse('2026-11-12T15:30:00Z');
  expect(rangeWindow('today', now, tz)).toEqual({
    since: '2026-11-12T00:00:00.000Z',
    until: '2026-11-12T15:30:00.000Z',
  });
  expect(rangeWindow('7d', now, tz).since).toBe('2026-11-06T00:00:00.000Z');
});

test('the funnel counts visits that scanned, opened the menu and ordered', () => {
  const report = insightsReport({
    range: '7d',
    since: '2026-11-06T00:00:00Z',
    until: '2026-11-12T23:59:00Z',
    timeZone: tz,
    orders: [],
    visits: [
      {
        startedAt: '2026-11-10T12:00:00Z',
        menuOpenedAt: '2026-11-10T12:01:00Z',
        orderedAt: '2026-11-10T12:05:00Z',
      },
      { startedAt: '2026-11-10T13:00:00Z', menuOpenedAt: '2026-11-10T13:01:00Z' },
      { startedAt: '2026-11-10T13:30:00Z' },
      { startedAt: '2026-10-01T13:30:00Z', menuOpenedAt: '2026-10-01T13:31:00Z' },
    ],
    feedback: [],
  });
  expect([report.scansCount, report.menuViewsCount, report.ordersCount]).toEqual([3, 2, 1]);
  expect(report.visitsByHour).toEqual([
    { hour: 12, visits: 1 },
    { hour: 13, visits: 2 },
  ]);
});

test('sales leave cancelled orders out; top dishes and peak hours come from the orders', () => {
  const report = insightsReport({
    range: 'today',
    since: '2026-11-12T00:00:00Z',
    until: '2026-11-12T23:00:00Z',
    timeZone: tz,
    orders: [
      order('2026-11-12T12:10:00Z', 2000),
      order('2026-11-12T12:40:00Z', 1000),
      order('2026-11-12T19:00:00Z', 5000, 'cancelled'),
    ],
    visits: [],
    feedback: [],
  });
  expect(report.salesPesewas).toBe(3000);
  expect(report.topItems).toEqual([{ name: 'Jollof', count: 2, pesewas: 3000 }]);
  expect(report.peakHours).toEqual([{ hour: 12, orders: 2 }]);
  expect(report.sample).toBe(false);
});

test('mood counts feedback in the window by sentiment', () => {
  const report = insightsReport({
    range: '7d',
    since: '2026-11-06T00:00:00Z',
    until: '2026-11-13T00:00:00Z',
    timeZone: tz,
    orders: [],
    visits: [],
    feedback: [
      { sentiment: 'positive', createdAt: '2026-11-10T10:00:00Z' },
      { sentiment: 'negative', createdAt: '2026-11-11T10:00:00Z' },
      { sentiment: 'positive', createdAt: '2026-10-01T10:00:00Z' },
    ],
  });
  expect(report.mood).toEqual({ positive: 1, neutral: 0, negative: 1 });
});

test('a quiet window is all zeros, not missing', () => {
  const report = insightsReport({
    range: '30d',
    since: '2026-10-13T00:00:00Z',
    until: '2026-11-12T00:00:00Z',
    timeZone: tz,
    orders: [],
    visits: [],
    feedback: [],
  });
  expect(report.salesPesewas).toBe(0);
  expect(report.series.every((point) => point.pesewas === 0)).toBe(true);
  expect(report.series.length).toBe(30);
  expect(report.repeatGuests).toEqual({ count: 0, sharePercent: 0 });
});
