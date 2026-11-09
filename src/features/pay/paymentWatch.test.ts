import { CHECKS, clock, eventFor, secondsLeft } from './paymentWatch';

const NOW = Date.parse('2026-11-09T12:00:00Z');

describe('secondsLeft', () => {
  test('counts whole seconds up to approveBy', () => {
    expect(secondsLeft(NOW + 180_000, NOW)).toBe(180);
  });
  test('rounds a part second up, so 0:00 only shows when time is really up', () => {
    expect(secondsLeft(NOW + 400, NOW)).toBe(1);
  });
  test('never goes below zero', () => {
    expect(secondsLeft(NOW - 5_000, NOW)).toBe(0);
  });
  test('a missing approveBy (NaN) counts as no time left', () => {
    expect(secondsLeft(Number.NaN, NOW)).toBe(0);
  });
});

describe('clock', () => {
  test('minutes and two-digit seconds', () => {
    expect(clock(180)).toBe('3:00');
    expect(clock(65)).toBe('1:05');
    expect(clock(9)).toBe('0:09');
    expect(clock(0)).toBe('0:00');
  });
});

describe('eventFor', () => {
  const base = { reference: 'ref_1' };
  const fallback = 'Not taken';

  test('succeeded is the only status that becomes paid', () => {
    expect(eventFor({ ...base, status: 'succeeded' }, 'waiting', 0, fallback)).toEqual({
      type: 'server_succeeded',
      reference: 'ref_1',
    });
  });

  test('failed carries the server reason, or the fallback words', () => {
    expect(
      eventFor({ ...base, status: 'failed', failureReason: 'No money' }, 'waiting', 0, fallback),
    ).toEqual({ type: 'server_failed', message: 'No money' });
    expect(eventFor({ ...base, status: 'failed' }, 'checking', 0, fallback)).toEqual({
      type: 'server_failed',
      message: fallback,
    });
  });

  test('abandoned while still waiting ends the countdown first, so verify gets a say', () => {
    expect(eventFor({ ...base, status: 'abandoned' }, 'waiting', 0, fallback)).toEqual({
      type: 'countdown_done',
    });
  });

  test('abandoned while checking means nobody approved in time', () => {
    expect(eventFor({ ...base, status: 'abandoned' }, 'checking', 1, fallback)).toEqual({
      type: 'verify_still_open',
    });
  });

  test('still open keeps waiting, and keeps checking until the checks run out', () => {
    expect(eventFor({ ...base, status: 'pay_offline' }, 'waiting', 0, fallback)).toBeNull();
    expect(
      eventFor({ ...base, status: 'pay_offline' }, 'checking', CHECKS - 1, fallback),
    ).toBeNull();
    expect(eventFor({ ...base, status: 'pay_offline' }, 'checking', CHECKS, fallback)).toEqual({
      type: 'verify_still_open',
    });
  });
});
