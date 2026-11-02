import { averageResponseMinutes, canRefund, moneyTotals, orderTab } from './ops';

test('orders sort into New, Cooking, Ready and Done', () => {
  expect(orderTab('received')).toBe('new');
  expect(orderTab('preparing')).toBe('cooking');
  expect(orderTab('ready')).toBe('ready');
  expect(orderTab('served')).toBe('done');
  expect(orderTab('cancelled')).toBe('done');
});

test('average response uses only calls someone picked up, rounded to whole minutes', () => {
  const at = (m: number) => new Date(Date.UTC(2026, 10, 2, 12, m)).toISOString();
  expect(
    averageResponseMinutes([
      { createdAt: at(0), acknowledgedAt: at(2) },
      { createdAt: at(10), acknowledgedAt: at(14) },
      { createdAt: at(20), acknowledgedAt: null },
    ]),
  ).toBe(3);
  expect(averageResponseMinutes([{ createdAt: at(0), acknowledgedAt: null }])).toBeNull();
});

test('only a payment that went through and is not yet refunded can be refunded', () => {
  expect(canRefund({ status: 'succeeded', settlement: 'settled' })).toBe(true);
  expect(canRefund({ status: 'succeeded', settlement: 'pending' })).toBe(true);
  expect(canRefund({ status: 'succeeded', settlement: 'refunded' })).toBe(false);
  expect(canRefund({ status: 'pending', settlement: 'pending' })).toBe(false);
  expect(canRefund({ status: 'failed', settlement: 'pending' })).toBe(false);
});

test('collected counts every payment that went through; settled only those paid out', () => {
  const tx = (amountPesewas: number, status: string, settlement: string) => ({
    amountPesewas,
    status,
    settlement,
  });
  expect(
    moneyTotals([
      tx(100, 'succeeded', 'settled'),
      tx(50, 'succeeded', 'pending'),
      tx(70, 'failed', 'pending'),
      tx(30, 'succeeded', 'refunded'),
    ]),
  ).toEqual({
    collected: 150,
    settled: 100,
    refunded: 30,
  });
});
