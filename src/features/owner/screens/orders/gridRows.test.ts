import { gridRows } from './gridRows';

describe('gridRows', () => {
  it('returns no rows for no items', () => {
    expect(gridRows([], 3)).toEqual([]);
  });

  it('puts one item per row on phones', () => {
    expect(gridRows(['a', 'b'], 1)).toEqual([['a'], ['b']]);
  });

  it('fills full rows and pads the last row with null', () => {
    expect(gridRows(['a', 'b', 'c', 'd'], 3)).toEqual([
      ['a', 'b', 'c'],
      ['d', null, null],
    ]);
  });

  it('keeps the order of the items', () => {
    expect(gridRows([1, 2, 3, 4], 2)).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  it('treats a column count under 1 as 1', () => {
    expect(gridRows(['a'], 0)).toEqual([['a']]);
  });
});
