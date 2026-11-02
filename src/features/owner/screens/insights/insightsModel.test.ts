import { busiestHour, moodTotals, shortMoney } from './insightsModel';

test('mood totals add up each day', () => {
  expect(
    moodTotals([
      { date: 'a', positive: 2, neutral: 1, negative: 0 },
      { date: 'b', positive: 1, neutral: 0, negative: 3 },
    ]),
  ).toEqual({ positive: 3, neutral: 1, negative: 3 });
  expect(moodTotals(undefined)).toEqual({ positive: 0, neutral: 0, negative: 0 });
});

test('busiest hour is the one with most orders, or none when empty or all zero', () => {
  expect(
    busiestHour([
      { hour: 12, orders: 4 },
      { hour: 19, orders: 9 },
    ]),
  ).toBe(19);
  expect(busiestHour([])).toBeNull();
  expect(busiestHour([{ hour: 9, orders: 0 }])).toBeNull();
});

test('short money keeps the currency symbol and shortens thousands', () => {
  expect(shortMoney(45_300, 'GHS')).toMatch(/453/);
  expect(shortMoney(1_250_000, 'GHS')).toMatch(/12\.5k|12,5k/);
});
