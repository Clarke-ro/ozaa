import { backAt, snoozeUntil } from './snooze';

const NOW = Date.parse('2026-11-24T14:20:00.000Z');

describe('snoozeUntil', () => {
  test('one or two hours from now', () => {
    expect(snoozeUntil('1h', NOW, 'Africa/Accra')).toBe('2026-11-24T15:20:00.000Z');
    expect(snoozeUntil('2h', NOW, 'Africa/Accra')).toBe('2026-11-24T16:20:00.000Z');
  });
  test('rest of today ends at the next midnight where the venue is', () => {
    expect(snoozeUntil('today', NOW, 'Africa/Accra')).toBe('2026-11-25T00:00:00.000Z');
    // Lagos is an hour ahead of UTC, so its midnight is 23:00 UTC.
    expect(snoozeUntil('today', NOW, 'Africa/Lagos')).toBe('2026-11-24T23:00:00.000Z');
  });
});

describe('backAt', () => {
  test('the time it comes back, in the venue’s own clock', () => {
    const item = { available: true, snoozedUntil: '2026-11-24T17:00:00.000Z' };
    expect(backAt(item, NOW, 'Africa/Accra')).toBe('17:00');
    expect(backAt(item, NOW, 'Africa/Lagos')).toBe('18:00');
  });
  test('tomorrow or later says the day too', () => {
    const item = { available: true, snoozedUntil: '2026-11-25T00:00:00.000Z' };
    expect(backAt(item, NOW, 'Africa/Accra')).toBe('Wed 00:00');
  });
  test('null when not snoozed, when the time has passed, or when switched off for good', () => {
    expect(backAt({ available: true }, NOW, 'Africa/Accra')).toBeNull();
    expect(
      backAt({ available: true, snoozedUntil: '2026-11-24T14:00:00.000Z' }, NOW, 'Africa/Accra'),
    ).toBeNull();
    expect(
      backAt({ available: false, snoozedUntil: '2026-11-24T17:00:00.000Z' }, NOW, 'Africa/Accra'),
    ).toBeNull();
  });
});
