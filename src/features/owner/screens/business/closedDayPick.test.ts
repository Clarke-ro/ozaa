import { daysIn, monthOptions } from './closedDayPick';

test('months start at this one and roll over the year', () => {
  expect(monthOptions(new Date(Date.UTC(2026, 10, 15)), 3)).toEqual([
    '2026-11',
    '2026-12',
    '2027-01',
  ]);
});

test('days in a month know about leap years', () => {
  expect(daysIn('2027-02')).toBe(28);
  expect(daysIn('2028-02')).toBe(29);
  expect(daysIn('2026-12')).toBe(31);
});
