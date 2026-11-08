import type { FloorStatus } from '../../floor/floorStatus';
import { FLOOR_FILTERS, filterTables, floorCounts } from './floorFilter';

const table = (id: string, status: FloorStatus) => ({ id, status });

const room = [
  table('t1', 'free'),
  table('t2', 'free'),
  table('t3', 'seated'),
  table('t4', 'ordered'),
  table('t5', 'waiting_to_pay'),
  table('t6', 'needs_waiter'),
  table('t7', 'needs_waiter'),
];

describe('floorCounts', () => {
  it('counts every table under all', () => {
    expect(floorCounts(room).all).toBe(7);
  });

  it('counts each status filter', () => {
    const counts = floorCounts(room);
    expect(counts.free).toBe(2);
    expect(counts.needs_waiter).toBe(2);
    expect(counts.waiting_to_pay).toBe(1);
  });

  it('counts every table that is not free as active', () => {
    expect(floorCounts(room).active).toBe(5);
  });

  it('gives zero for every filter on an empty floor', () => {
    expect(floorCounts([])).toEqual({
      all: 0,
      needs_waiter: 0,
      waiting_to_pay: 0,
      active: 0,
      free: 0,
    });
  });
});

describe('filterTables', () => {
  it('returns every table, in order, for all', () => {
    expect(filterTables(room, 'all')).toEqual(room);
  });

  it('keeps seated, ordered, paying and calling tables for active', () => {
    expect(filterTables(room, 'active').map((item) => item.id)).toEqual([
      't3',
      't4',
      't5',
      't6',
      't7',
    ]);
  });

  it('keeps only the matching status for a status filter', () => {
    expect(filterTables(room, 'needs_waiter').map((item) => item.id)).toEqual(['t6', 't7']);
    expect(filterTables(room, 'free').map((item) => item.id)).toEqual(['t1', 't2']);
  });

  it('agrees with floorCounts for every filter', () => {
    const counts = floorCounts(room);
    for (const filter of FLOOR_FILTERS) {
      expect(filterTables(room, filter)).toHaveLength(counts[filter]);
    }
  });
});
