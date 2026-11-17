import { previousWindow, salesReport, type SalesOrder } from './sales';

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
  expect(report.byStatus).toEqual({ received: 1, accepted: 0, preparing: 0, ready: 0, served: 1, cancelled: 1 });
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

test('payments split the value: online, in person, or not yet (part-paid counts as not yet)', () => {
  const report = salesReport(
    [
      order({ totalPesewas: 5000, paymentStatus: 'paid', paymentMethod: 'online_momo' }),
      order({ totalPesewas: 3000, paymentStatus: 'paid', paymentMethod: 'cash' }),
      order({ totalPesewas: 2000, paymentStatus: 'unpaid' }),
      order({ totalPesewas: 4000, paymentStatus: 'part_paid' }),
      order({ status: 'cancelled', totalPesewas: 9000, paymentStatus: 'unpaid' }),
    ],
    tz,
  );
  expect(report.payments).toMatchObject({
    onlinePesewas: 5000,
    inPersonPesewas: 3000,
    unpaidPesewas: 6000,
  });
});

test('average order value is the money divided by orders, rounded to the pesewa', () => {
  const report = salesReport([order({ totalPesewas: 1000 }), order({ totalPesewas: 2001 })], tz);
  expect(report.avgPesewas).toBe(1501);
  expect(salesReport([], tz).avgPesewas).toBe(0);
});

test('by hour uses the venue clock and skips empty hours', () => {
  // 23:30 UTC is 23:30 in Accra (UTC+0); 12:10 UTC is 13:10 in Lagos (UTC+1).
  const accra = salesReport(
    [order({ createdAt: '2026-11-04T23:30:00Z' }), order({ createdAt: '2026-11-04T23:59:00Z' })],
    tz,
  );
  expect(accra.byHour).toEqual([{ hour: 23, orders: 2, pesewas: 10000 }]);
  const lagos = salesReport([order({ createdAt: '2026-11-04T12:10:00Z' })], 'Africa/Lagos');
  expect(lagos.byHour[0]?.hour).toBe(13);
});

test('by staff counts the person who handled the order; untouched guest orders are left out', () => {
  const ama = { staffId: 's1', firstName: 'Ama', role: 'waiter' as const };
  const report = salesReport(
    [order({ handledBy: ama }), order({ handledBy: ama, totalPesewas: 3000 }), order({})],
    tz,
  );
  expect(report.byStaff).toEqual([{ ...ama, orders: 2, pesewas: 8000 }]);
});

test('by method only counts fully paid orders, biggest first', () => {
  const report = salesReport(
    [
      order({ paymentStatus: 'paid', paymentMethod: 'cash', totalPesewas: 2000 }),
      order({ paymentStatus: 'paid', paymentMethod: 'online_momo', totalPesewas: 7000 }),
      order({ paymentStatus: 'unpaid', paymentMethod: null }),
    ],
    tz,
  );
  expect(report.payments.byMethod).toEqual([
    { method: 'online_momo', orders: 1, pesewas: 7000 },
    { method: 'cash', orders: 1, pesewas: 2000 },
  ]);
});

test('tax is null until tax is set up, then sums the tax lines of counted orders', () => {
  const taxed = order({
    taxes: [
      { code: 'vat', label: 'VAT', amountPesewas: 600 },
      { code: 'nhil', label: 'NHIL', amountPesewas: 100 },
      { code: 'getfund', label: 'GETFund', amountPesewas: 100 },
    ],
  });
  expect(salesReport([taxed], tz).tax).toBeNull();
  const report = salesReport([taxed, order({ status: 'cancelled', taxes: taxed.taxes })], tz, {
    taxEnabled: true,
  });
  expect(report.tax).toEqual({
    vatPesewas: 600,
    nhilPesewas: 100,
    getfundPesewas: 100,
    totalPesewas: 800,
  });
});

test('previous period is the same length just before since', () => {
  expect(previousWindow('2026-11-04T00:00:00Z', '2026-11-11T00:00:00Z')).toEqual({
    since: '2026-10-28T00:00:00.000Z',
    until: '2026-11-04T00:00:00.000Z',
  });
  expect(previousWindow(undefined, '2026-11-11T00:00:00Z')).toBeNull();
});
