import { bucket, insightTiles, salesLine, type DashboardLike } from './dashboardModel';

const base: DashboardLike = { changePercent: 12, direction: 'up' };

describe('salesLine', () => {
  test('up and down give the brand sentence key with the percent', () => {
    expect(salesLine(base)).toEqual({ key: 'owner.madeUp', percent: 12, tone: 'up' });
    expect(salesLine({ changePercent: -8, direction: 'down' })).toEqual({
      key: 'owner.madeDown',
      percent: 8,
      tone: 'down',
    });
  });

  test('no comparison when the server has none: never a made-up percent', () => {
    expect(salesLine({ changePercent: null, direction: 'none' })).toEqual({
      key: 'owner.made',
      percent: null,
      tone: 'flat',
    });
    expect(salesLine({ changePercent: 0, direction: 'flat' })).toEqual({
      key: 'owner.made',
      percent: null,
      tone: 'flat',
    });
  });
});

describe('insightTiles', () => {
  test('only tiles the server sent, in a fixed order', () => {
    const tiles = insightTiles({ scansCount: 30, loyaltyMetrics: { enrolled: 4, redeemed: 0 } });
    expect(tiles).toEqual([
      { id: 'scans', value: 30 },
      { id: 'enrolled', value: 4 },
      { id: 'redeemed', value: 0 },
    ]);
  });

  test('nothing sent means no tiles, not sample numbers', () => {
    expect(insightTiles({})).toEqual([]);
    expect(insightTiles(undefined)).toEqual([]);
  });
});

describe('bucket', () => {
  const days = Array.from({ length: 30 }, (_, i) => ({ key: `d${i + 1}`, value: 1 }));

  test('folds many points into at most n bars and keeps the total', () => {
    const bars = bucket(days, 7);
    expect(bars.length).toBeLessThanOrEqual(7);
    expect(bars.reduce((sum, bar) => sum + bar.value, 0)).toBe(30);
  });

  test('labels each bar with the first point it covers', () => {
    expect(bucket(days, 7)[0]?.key).toBe('d1');
  });

  test('a short series stays one bar per point', () => {
    expect(bucket(days.slice(0, 5), 7)).toEqual(days.slice(0, 5));
  });

  test('empty in, empty out', () => {
    expect(bucket([], 7)).toEqual([]);
  });
});
