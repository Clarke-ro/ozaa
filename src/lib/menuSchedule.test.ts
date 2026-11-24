import { isCategoryAvailable } from './menuSchedule';

describe('isCategoryAvailable', () => {
  test('returns true when schedule is undefined or empty', () => {
    expect(isCategoryAvailable(undefined)).toBe(true);
  });

  test('checks day of week (0 = Sunday, 1 = Monday, etc.)', () => {
    // 2026-11-02 is Monday (day 1)
    const monday = new Date('2026-11-02T13:00:00Z');
    // 2026-11-08 is Sunday (day 0)
    const sunday = new Date('2026-11-08T13:00:00Z');

    const schedule = {
      days: [1, 2, 3, 4, 5], // Monday - Friday
      startTime: '11:00',
      endTime: '15:00',
    };

    expect(isCategoryAvailable(schedule, monday)).toBe(true);
    expect(isCategoryAvailable(schedule, sunday)).toBe(false);
  });

  test('checks time window on active day', () => {
    // Monday at 12:30 (inside 12:00 - 15:00)
    const duringLunch = new Date('2026-11-02T12:30:00Z');
    // Monday at 16:00 (outside)
    const afterLunch = new Date('2026-11-02T16:00:00Z');
    // Monday at 11:30 (before)
    const beforeLunch = new Date('2026-11-02T11:30:00Z');

    const schedule = {
      days: [1],
      startTime: '12:00',
      endTime: '15:00',
    };

    expect(isCategoryAvailable(schedule, duringLunch)).toBe(true);
    expect(isCategoryAvailable(schedule, afterLunch)).toBe(false);
    expect(isCategoryAvailable(schedule, beforeLunch)).toBe(false);
  });
});
