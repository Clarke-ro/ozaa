import { describeHours, type OpeningHours } from './time';

const daily = (opens: string, closes: string): OpeningHours => ({
  timezone: 'Africa/Accra',
  weekly: Array.from({ length: 7 }, () => [{ opens, closes }]),
});

test('says open until the closing hour', () => {
  const label = describeHours(daily('09:00', '22:00'), new Date('2026-10-31T18:00:00Z'));
  expect(label).toEqual({ open: true, text: 'Open now · until 10 PM' });
});

test('says when a closed venue opens next', () => {
  const label = describeHours(daily('09:00', '22:00'), new Date('2026-10-31T23:30:00Z'));
  expect(label.open).toBe(false);
  expect(label.text).toBe('Closed · opens Sunday 9 AM');
});

test('treats an empty day as closed', () => {
  const hours = daily('09:00', '22:00');
  hours.weekly[5] = [];
  const label = describeHours(hours, new Date('2026-10-31T12:00:00Z'));
  expect(label.text).toBe('Closed · opens Sunday 9 AM');
});
