import type { FloorTone } from '@/theme/palette';
import type { FloorStatus } from '../../floor/floorStatus';
import { TONE_OF } from './floorLook';

/**
 * The Floor in three bands, in the order a waiter should look at them: tables that need someone
 * now (a call or a bill), tables that are eating, and free tables.
 */
export type FloorGroup = 'attention' | 'eating' | 'free';

const GROUP_OF: Record<FloorStatus, FloorGroup> = {
  needs_waiter: 'attention',
  waiting_to_pay: 'attention',
  seated: 'eating',
  ordered: 'eating',
  free: 'free',
};

const ORDER: readonly FloorGroup[] = ['attention', 'eating', 'free'];

// Inside "attention", a guest calling beats a bill: someone is actively waiting on a person.
const URGENCY: Record<FloorStatus, number> = {
  needs_waiter: 0,
  waiting_to_pay: 1,
  ordered: 2,
  seated: 2,
  free: 3,
};

export function floorGroupOf(status: FloorStatus): FloorGroup {
  return GROUP_OF[status];
}

/** The tables split into bands, most urgent band first. Empty bands are left out. */
export function groupTables<T extends { status: FloorStatus }>(
  tables: readonly T[],
): { id: FloorGroup; tables: T[] }[] {
  return ORDER.map((id) => ({
    id,
    // Array.prototype.sort is stable, so tables keep their room order within one urgency.
    tables: tables
      .filter((table) => GROUP_OF[table.status] === id)
      .sort((a, b) => URGENCY[a.status] - URGENCY[b.status]),
  })).filter((group) => group.tables.length > 0);
}

/** How many tables are in each colour, for the room bar at the top of the Floor. */
export function toneCounts(tables: readonly { status: FloorStatus }[]): Record<FloorTone, number> {
  const counts: Record<FloorTone, number> = { free: 0, occupied: 0, paying: 0, calling: 0 };
  for (const table of tables) counts[TONE_OF[table.status]] += 1;
  return counts;
}

/** The chips above the Floor (canvas): every table, or one kind. */
export type FloorFilter = 'all' | 'calling' | 'eating' | 'paying' | 'free';
export const FLOOR_FILTERS: readonly FloorFilter[] = ['all', 'calling', 'eating', 'paying', 'free'];

const FILTER_OF: Record<FloorStatus, Exclude<FloorFilter, 'all'>> = {
  needs_waiter: 'calling',
  seated: 'eating',
  ordered: 'eating',
  waiting_to_pay: 'paying',
  free: 'free',
};

export function inFloorFilter(status: FloorStatus, filter: FloorFilter): boolean {
  return filter === 'all' || FILTER_OF[status] === filter;
}

export function floorFilterCounts(
  tables: readonly { status: FloorStatus }[],
): Record<FloorFilter, number> {
  const counts: Record<FloorFilter, number> = { all: 0, calling: 0, eating: 0, paying: 0, free: 0 };
  for (const table of tables) {
    counts.all += 1;
    counts[FILTER_OF[table.status]] += 1;
  }
  return counts;
}

/** Tables with someone at them, for "5 of 9 tables in use". */
export function tablesInUse(tables: readonly { status: FloorStatus }[]): number {
  return tables.filter((table) => table.status !== 'free').length;
}
