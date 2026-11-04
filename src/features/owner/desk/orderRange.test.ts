import { orderRange } from './orderRange';

// 4 Nov 2026, 15:30 in Accra (UTC+0).
const now = Date.parse('2026-11-04T15:30:00Z');
const accra = 'Africa/Accra';

test('all time sends no dates', () => {
  expect(orderRange('all', now, accra)).toEqual({});
});

test('today runs from midnight to now-and-after', () => {
  expect(orderRange('today', now, accra)).toEqual({ since: '2026-11-04T00:00:00.000Z' });
});

test('yesterday is the whole day before, midnight to midnight', () => {
  expect(orderRange('yesterday', now, accra)).toEqual({
    since: '2026-11-03T00:00:00.000Z',
    until: '2026-11-04T00:00:00.000Z',
  });
});

test('last 7 and 30 days count today as one of them', () => {
  expect(orderRange('7d', now, accra)).toEqual({ since: '2026-10-29T00:00:00.000Z' });
  expect(orderRange('30d', now, accra)).toEqual({ since: '2026-10-06T00:00:00.000Z' });
});

test('midnight is the venue’s midnight, not the phone’s', () => {
  // 23:30 UTC on the 4th is already the 5th in Lagos (UTC+1).
  const late = Date.parse('2026-11-04T23:30:00Z');
  expect(orderRange('today', late, 'Africa/Lagos')).toEqual({ since: '2026-11-04T23:00:00.000Z' });
});
