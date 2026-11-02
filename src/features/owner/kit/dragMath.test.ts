import { dropIndex, moveItem, shiftFor } from './dragMath';

describe('drag to reorder', () => {
  const step = 60;

  it('works out where a dragged row lands, never past the ends', () => {
    expect(dropIndex(1, 0, step, 5)).toBe(1);
    expect(dropIndex(1, 65, step, 5)).toBe(2);
    expect(dropIndex(1, -200, step, 5)).toBe(0);
    expect(dropIndex(3, 400, step, 5)).toBe(4);
    // Less than half a row does not count as a move.
    expect(dropIndex(2, 25, step, 5)).toBe(2);
  });

  it('moves one item and keeps the rest in order', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveItem(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c']);
    expect(moveItem(['a', 'b'], 1, 1)).toEqual(['a', 'b']);
  });

  it('slides the rows between the start and the drop point out of the way', () => {
    // Dragging row 0 down to 2: rows 1 and 2 move up one step, row 3 stays.
    expect([1, 2, 3].map((i) => shiftFor(i, 0, 2, step))).toEqual([-step, -step, 0]);
    // Dragging row 3 up to 1: rows 1 and 2 move down one step, row 0 stays.
    expect([0, 1, 2].map((i) => shiftFor(i, 3, 1, step))).toEqual([0, step, step]);
  });
});
