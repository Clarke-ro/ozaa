import { describeHours, timeAgo, type OpeningHours } from './time';

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

describe('timeAgo', () => {
  const now = Date.parse('2026-11-02T12:00:00Z');
  const ago = (ms: number) => new Date(now - ms).toISOString();
  // A stand-in for i18next's t: returns the key and count so the test checks which line is used.
  const t = (key: string, vars?: { count?: number }) =>
    vars?.count == null ? key : `${key}:${vars.count}`;

  it('says "just now" under a minute', () => {
    expect(timeAgo(ago(20_000), now, t)).toBe('time.now');
  });

  it('uses minutes, then hours, then days', () => {
    expect(timeAgo(ago(5 * 60_000), now, t)).toBe('time.minutesAgo:5');
    expect(timeAgo(ago(3 * 3_600_000), now, t)).toBe('time.hoursAgo:3');
    expect(timeAgo(ago(2 * 86_400_000), now, t)).toBe('time.daysAgo:2');
  });

  it('never goes negative when the phone clock is behind', () => {
    expect(timeAgo(ago(-60_000), now, t)).toBe('time.now');
  });
});
