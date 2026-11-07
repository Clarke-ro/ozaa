import type { FloorStatus } from '../../floor/floorStatus';

/** The chips above the floor. Two are groups ("all", "active"); the rest are one status each. */
export type FloorFilter = 'all' | 'needs_waiter' | 'waiting_to_pay' | 'active' | 'free';

/** Chip order: the tables that need someone first, then the calm ones. */
export const FLOOR_FILTERS: readonly FloorFilter[] = [
  'all',
  'needs_waiter',
  'waiting_to_pay',
  'active',
  'free',
];

function matches(status: FloorStatus, filter: FloorFilter): boolean {
  if (filter === 'all') return true;
  // "Active" means someone is at the table: seated, ordered, paying or calling.
  if (filter === 'active') return status !== 'free';
  return status === filter;
}

export function filterTables<T extends { status: FloorStatus }>(
  tables: readonly T[],
  filter: FloorFilter,
): T[] {
  return tables.filter((table) => matches(table.status, filter));
}

export function floorCounts(
  tables: readonly { status: FloorStatus }[],
): Record<FloorFilter, number> {
  const counts: Record<FloorFilter, number> = {
    all: 0,
    needs_waiter: 0,
    waiting_to_pay: 0,
    active: 0,
    free: 0,
  };
  for (const table of tables) {
    for (const filter of FLOOR_FILTERS) {
      if (matches(table.status, filter)) counts[filter] += 1;
    }
  }
  return counts;
}
