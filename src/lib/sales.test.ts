import { salesReport, type SalesOrder } from './sales';

const tz = 'Africa/Accra';
const order = (over: Partial<SalesOrder>): SalesOrder => ({
  status: 'served',
  createdAt: '2026-11-04T12:00:00Z',
  totalPesewas: 5000,
  deliveryFeePesewas: 0,
  source: 'table',
  lines: [{ name: 'Jollof', quantity: 1, totalPesewas: 5000, discountPesewas: 0 }],
  ...over,
});

test('money and counts leave cancelled orders out of the money but in the status count', () => {
  const report = salesReport(
    [order({}), order({ status: 'cancelled', totalPesewas: 9000 }), order({ status: 'received' })],
    tz,
  );
  expect(report.orderCount).toBe(2);
  expect(report.valuePesewas).toBe(10000);
  expect(report.byStatus).toEqual({ received: 1, preparing: 0, ready: 0, served: 1, cancelled: 1 });
});

test('discounts and delivery fees add up across orders', () => {
  const report = salesReport(
    [
      order({
        lines: [{ name: 'Jollof', quantity: 2, totalPesewas: 8000, discountPesewas: 3000 }],
        totalPesewas: 8000,
      }),
      order({ source: 'delivery', deliveryFeePesewas: 1000, totalPesewas: 6000 }),
    ],
    tz,
  );
  expect(report.discountsPesewas).toBe(3000);
  expect(report.deliveryFeesPesewas).toBe(1000);
});

test('by source counts each kind once, biggest first; older orders without a source are table', () => {
  const report = salesReport(
    [
      order({}),
      order({ source: undefined }),
      order({ source: 'pickup', totalPesewas: 20000 }),
      order({ source: 'delivery', totalPesewas: 3000 }),
    ],
    tz,
  );
  expect(report.bySource).toEqual([
    { source: 'pickup', orders: 1, pesewas: 20000 },
    { source: 'table', orders: 2, pesewas: 10000 },
    { source: 'delivery', orders: 1, pesewas: 3000 },
  ]);
});

test('top items rank by money, at most five, joining the same dish across orders', () => {
  const many = ['A', 'B', 'C', 'D', 'E', 'F'].map((name, index) =>
    order({ lines: [{ name, quantity: 1, totalPesewas: 1000 * (index + 1), discountPesewas: 0 }] }),
  );
  const report = salesReport(
    [
      ...many,
      order({ lines: [{ name: 'A', quantity: 2, totalPesewas: 9000, discountPesewas: 0 }] }),
    ],
    tz,
  );
  expect(report.topItems.map((item) => item.name)).toEqual(['A', 'F', 'E', 'D', 'C']);
  expect(report.topItems[0]).toEqual({ name: 'A', count: 3, pesewas: 10000 });
});

test('days group by the venue calendar, oldest first', () => {
  const report = salesReport(
    [
      order({ createdAt: '2026-11-04T23:30:00Z' }),
      order({ createdAt: '2026-11-03T08:00:00Z', totalPesewas: 2000 }),
      order({ createdAt: '2026-11-04T09:00:00Z' }),
    ],
    tz,
  );
  expect(report.days).toEqual([
    { date: '2026-11-03', orders: 1, pesewas: 2000 },
    { date: '2026-11-04', orders: 2, pesewas: 10000 },
  ]);
});
