import { summarizeDay } from './daySummary';

const base = {
  openCalls: 0,
  openBillCalls: 0,
  payments: true,
  ratings: [5, 4],
  nowIso: '2026-10-31T18:00:00Z',
  timeZone: 'Africa/Accra',
  yesterdayPesewas: 221429,
  payoutVerified: true,
  soldOut: [] as string[],
};

test('today sales use paid pesewas on the venue calendar day', () => {
  const summary = summarizeDay({
    ...base,
    orders: [
      {
        status: 'served',
        paidPesewas: 248000,
        createdAt: '2026-10-31T12:00:00Z',
        paymentStatus: 'paid',
      },
      {
        status: 'cancelled',
        paidPesewas: 5000,
        createdAt: '2026-10-31T13:00:00Z',
        paymentStatus: 'unpaid',
      },
      {
        status: 'served',
        paidPesewas: 9000,
        createdAt: '2026-10-30T23:30:00Z',
        paymentStatus: 'paid',
      },
    ],
  });
  expect(summary.salesTodayPesewas).toBe(248000);
  expect(summary.changePercent).toBe(12);
  expect(summary.direction).toBe('up');
  expect(summary.ratingAverage).toBe(4.5);
});

test('a late evening order in Lagos still counts as the next local day', () => {
  const summary = summarizeDay({
    ...base,
    timeZone: 'Africa/Lagos',
    nowIso: '2026-10-31T00:30:00Z',
    yesterdayPesewas: 0,
    ratings: [],
    orders: [
      {
        status: 'served',
        paidPesewas: 1000,
        createdAt: '2026-10-30T23:30:00Z',
        paymentStatus: 'paid',
      },
    ],
  });
  expect(summary.salesTodayPesewas).toBe(1000);
  expect(summary.direction).toBe('none');
  expect(summary.ratingAverage).toBeNull();
});

test('alerts name calls, unpaid served bills, an unchecked payout, and sold-out dishes', () => {
  const summary = summarizeDay({
    ...base,
    openCalls: 2,
    payoutVerified: false,
    soldOut: ['Banku & tilapia'],
    orders: [
      {
        status: 'served',
        paidPesewas: 0,
        createdAt: '2026-10-31T15:00:00Z',
        paymentStatus: 'unpaid',
      },
    ],
  });
  expect(summary.alerts.map((alert) => alert.code)).toEqual([
    'calls',
    'bills',
    'payout',
    'sold_out',
  ]);
});

test('with payments off, bills come from bill requests and there is no payout alert', () => {
  const summary = summarizeDay({
    ...base,
    payments: false,
    openCalls: 3,
    openBillCalls: 2,
    payoutVerified: false,
    orders: [
      {
        status: 'served',
        paidPesewas: 0,
        createdAt: '2026-10-31T15:00:00Z',
        paymentStatus: 'unpaid',
      },
    ],
  });
  expect(summary.alerts).toEqual([
    { code: 'calls', count: 3 },
    { code: 'bills', count: 2 },
  ]);
});

test('with payments off and no bill requests, served unpaid orders raise nothing', () => {
  const summary = summarizeDay({
    ...base,
    payments: false,
    payoutVerified: false,
    orders: [
      {
        status: 'served',
        paidPesewas: 0,
        createdAt: '2026-10-31T15:00:00Z',
        paymentStatus: 'unpaid',
      },
    ],
  });
  expect(summary.alerts).toEqual([]);
});

test('orders today skip cancelled ones and earlier days; pending counts only received', () => {
  const order = (status: string, createdAt: string) => ({
    status,
    paidPesewas: 0,
    createdAt,
    paymentStatus: 'unpaid',
  });
  const summary = summarizeDay({
    ...base,
    orders: [
      order('received', '2026-10-31T09:00:00Z'),
      order('received', '2026-10-30T22:00:00Z'),
      order('preparing', '2026-10-31T10:00:00Z'),
      order('cancelled', '2026-10-31T11:00:00Z'),
      order('served', '2026-10-31T12:00:00Z'),
    ],
  });
  expect(summary.ordersToday).toBe(3);
  // Yesterday's received ticket still needs the kitchen, so it counts as pending.
  expect(summary.pendingOrders).toBe(2);
});
