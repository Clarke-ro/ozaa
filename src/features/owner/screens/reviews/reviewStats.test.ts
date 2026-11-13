import { starCounts } from './reviewStats';

test('counts reviews at each star level, 5 down to 1', () => {
  expect(starCounts([{ stars: 5 }, { stars: 2 }, { stars: 5 }])).toEqual([
    { stars: 5, count: 2 },
    { stars: 4, count: 0 },
    { stars: 3, count: 0 },
    { stars: 2, count: 1 },
    { stars: 1, count: 0 },
  ]);
});
