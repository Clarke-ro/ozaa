import type { FloorStatus } from '../../floor/floorStatus';
import { floorGroupOf, groupTables, toneCounts } from './floorGroups';

const table = (id: string, status: FloorStatus) => ({ id, status });

describe('floorGroupOf', () => {
  it('puts calls and bills under attention', () => {
    expect(floorGroupOf('needs_waiter')).toBe('attention');
    expect(floorGroupOf('waiting_to_pay')).toBe('attention');
  });

  it('puts seated and ordered tables under eating', () => {
    expect(floorGroupOf('seated')).toBe('eating');
    expect(floorGroupOf('ordered')).toBe('eating');
  });

  it('keeps free tables apart', () => {
    expect(floorGroupOf('free')).toBe('free');
  });
});

describe('groupTables', () => {
  it('lists attention first, then eating, then free', () => {
    const groups = groupTables([
      table('a', 'free'),
      table('b', 'ordered'),
      table('c', 'waiting_to_pay'),
    ]);
    expect(groups.map((g) => g.id)).toEqual(['attention', 'eating', 'free']);
  });

  it('puts a call before a bill inside attention, and keeps room order otherwise', () => {
    const groups = groupTables([
      table('pay1', 'waiting_to_pay'),
      table('call1', 'needs_waiter'),
      table('pay2', 'waiting_to_pay'),
      table('call2', 'needs_waiter'),
    ]);
    expect(groups[0]?.tables.map((t) => t.id)).toEqual(['call1', 'call2', 'pay1', 'pay2']);
  });

  it('leaves out groups with no tables', () => {
    const groups = groupTables([table('a', 'free'), table('b', 'free')]);
    expect(groups).toEqual([{ id: 'free', tables: [table('a', 'free'), table('b', 'free')] }]);
  });

  it('gives nothing for an empty room', () => {
    expect(groupTables([])).toEqual([]);
  });
});

describe('toneCounts', () => {
  it('counts tables by colour: seated and ordered are both occupied', () => {
    expect(
      toneCounts([
        table('a', 'free'),
        table('b', 'seated'),
        table('c', 'ordered'),
        table('d', 'waiting_to_pay'),
        table('e', 'needs_waiter'),
      ]),
    ).toEqual({ free: 1, occupied: 2, paying: 1, calling: 1 });
  });

  it('gives zero for every colour in an empty room', () => {
    expect(toneCounts([])).toEqual({ free: 0, occupied: 0, paying: 0, calling: 0 });
  });
});
