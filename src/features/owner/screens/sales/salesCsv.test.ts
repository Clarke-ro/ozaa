import { salesCsv } from './salesCsv';

test('one row per day, money in cedis with two decimals', () => {
  const csv = salesCsv({
    currency: 'GHS',
    days: [
      { date: '2026-11-01', orders: 3, pesewas: 12_050 },
      { date: '2026-11-02', orders: 0, pesewas: 0 },
    ],
  });
  expect(csv).toBe('Date,Orders,Order value (GHS)\n2026-11-01,3,120.50\n2026-11-02,0,0.00\n');
});
