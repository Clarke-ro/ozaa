import { bestDay, dishShares, paymentShares } from './salesModel';

test('the best day is the one with the most money', () => {
  expect(
    bestDay([
      { date: '2026-11-11', orders: 2, pesewas: 100 },
      { date: '2026-11-12', orders: 9, pesewas: 317_500 },
    ]),
  ).toEqual({ date: '2026-11-12', orders: 9, pesewas: 317_500 });
  expect(bestDay([{ date: 'x', orders: 0, pesewas: 0 }])).toBeNull();
});

test('top dishes take the first four, the rest go into "Other dishes"', () => {
  const items = [
    { name: 'A', count: 7, pesewas: 43_500 },
    { name: 'B', count: 2, pesewas: 9_000 },
    { name: 'C', count: 1, pesewas: 9_000 },
    { name: 'D', count: 4, pesewas: 6_000 },
    { name: 'E', count: 3, pesewas: 248_000 - 6_000 - 9_000 - 9_000 - 43_500 },
  ];
  const r = dishShares(items, 317_500);
  expect(r.top.map((d) => d.name)).toEqual(['E', 'A', 'B', 'C']);
  expect(r.other).toEqual({ count: 4, pesewas: 6_000, percent: 2 });
  expect(r.top[1]?.percent).toBe(14);
});

test('payment shares list every method in canvas order, zeros included, then not paid', () => {
  const rows = paymentShares({
    valuePesewas: 1000,
    payments: {
      unpaidPesewas: 220,
      byMethod: [
        { method: 'cash', orders: 3, pesewas: 560 },
        { method: 'momo_merchant', orders: 1, pesewas: 220 },
      ],
    },
  });
  expect(rows).toEqual([
    { key: 'cash', percent: 56 },
    { key: 'momo_merchant', percent: 22 },
    { key: 'card_machine', percent: 0 },
    { key: 'bank_transfer', percent: 0 },
    { key: 'online_card', percent: 0 },
    { key: 'online_momo', percent: 0 },
    { key: 'unpaid', percent: 22 },
  ]);
});
