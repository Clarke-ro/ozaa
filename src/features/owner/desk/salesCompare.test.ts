import { fillDays, percentChange, previousOrderRange } from './salesCompare';

// 4 Nov 2026, 15:30 in Accra (UTC+0).
const now = Date.parse('2026-11-04T15:30:00Z');
const accra = 'Africa/Accra';

describe('previousOrderRange', () => {
  test('all time has nothing before it to compare with', () => {
    expect(previousOrderRange('all', now, accra)).toBeNull();
  });

  test('today compares with the whole of yesterday', () => {
    expect(previousOrderRange('today', now, accra)).toEqual({
      since: '2026-11-03T00:00:00.000Z',
      until: '2026-11-04T00:00:00.000Z',
    });
  });

  test('yesterday compares with the day before it', () => {
    expect(previousOrderRange('yesterday', now, accra)).toEqual({
      since: '2026-11-02T00:00:00.000Z',
      until: '2026-11-03T00:00:00.000Z',
    });
  });

  test('the last 7 and 30 days compare with the same number of days just before', () => {
    expect(previousOrderRange('7d', now, accra)).toEqual({
      since: '2026-10-22T00:00:00.000Z',
      until: '2026-10-29T00:00:00.000Z',
    });
    expect(previousOrderRange('30d', now, accra)).toEqual({
      since: '2026-09-06T00:00:00.000Z',
      until: '2026-10-06T00:00:00.000Z',
    });
  });
});

describe('percentChange', () => {
  test('rounds to a whole percent, up or down', () => {
    expect(percentChange(112, 100)).toBe(12);
    expect(percentChange(75, 100)).toBe(-25);
    expect(percentChange(100, 100)).toBe(0);
  });

  test('nothing before means no percent at all, never a made-up 100%', () => {
    expect(percentChange(50, 0)).toBeNull();
    expect(percentChange(0, 0)).toBeNull();
  });
});

describe('fillDays', () => {
  test('puts a zero on every day with no orders, so the chart does not skip days', () => {
    const days = [
      { date: '2026-11-02', pesewas: 500 },
      { date: '2026-11-04', pesewas: 900 },
    ];
    expect(fillDays(days, '2026-11-01', '2026-11-04')).toEqual([
      { date: '2026-11-01', pesewas: 0 },
      { date: '2026-11-02', pesewas: 500 },
      { date: '2026-11-03', pesewas: 0 },
      { date: '2026-11-04', pesewas: 900 },
    ]);
  });

  test('works across a month end', () => {
    expect(fillDays([], '2026-10-30', '2026-11-01').map((d) => d.date)).toEqual([
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
    ]);
  });

  test('with no range it keeps only the days the server sent, in date order', () => {
    const days = [
      { date: '2026-11-04', pesewas: 900 },
      { date: '2026-11-02', pesewas: 500 },
    ];
    expect(fillDays(days, null, null).map((d) => d.date)).toEqual(['2026-11-02', '2026-11-04']);
  });
});
