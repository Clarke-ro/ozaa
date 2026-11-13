import { formatWhen, parseWhen } from './noticeForm';
import { midnight, orderRange } from './orderRange';
import { previousOrderRange } from './salesCompare';

/** The chips on Sales (design canvas), plus "Pick dates" for any days you choose. */
export type SalesRangeId = 'today' | 'yesterday' | 'week' | 'month' | '30d' | 'custom';
export const SALES_RANGES: readonly Exclude<SalesRangeId, 'custom'>[] = [
  'today',
  'yesterday',
  'week',
  'month',
  '30d',
];
export type SalesRange = { id: SalesRangeId; from?: string; to?: string };

type Window = { since?: string; until?: string };
const DAY_MS = 24 * 60 * 60 * 1000;

/** The venue's date today as y, m, d, and how many days since Monday (0 on a Monday). */
function venueToday(now: number, timeZone: string) {
  const date = formatWhen(new Date(now).toISOString(), timeZone).slice(0, 10);
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const sinceMonday = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
  return { y, m, d, sinceMonday };
}

/** Midnight in the venue's zone at the start of a calendar day "YYYY-MM-DD". */
function dayStart(day: string, timeZone: string): string | null {
  const parsed = parseWhen(`${day} 00:00`, timeZone);
  return parsed.ok && parsed.iso ? parsed.iso : null;
}

const addDays = (day: string, n: number) =>
  new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);

/** The since/until for a Sales range. Days start at the venue's midnight, like Orders. */
export function salesRange(range: SalesRange, now: number, timeZone: string): Window {
  const today = venueToday(now, timeZone);
  switch (range.id) {
    case 'week':
      return { since: midnight(now, today.sinceMonday, timeZone) };
    case 'month':
      return { since: midnight(now, today.d - 1, timeZone) };
    case 'custom': {
      if (!range.from || !range.to) return {};
      const since = dayStart(range.from, timeZone);
      const until = dayStart(addDays(range.to, 1), timeZone);
      return since && until ? { since, until } : {};
    }
    default:
      return orderRange(range.id, now, timeZone);
  }
}

/**
 * The period to compare with: last week for this week, the whole month before for this month,
 * and for picked dates the same number of days just before them.
 */
export function previousSalesRange(
  range: SalesRange,
  now: number,
  timeZone: string,
): { since: string; until: string } | null {
  const today = venueToday(now, timeZone);
  switch (range.id) {
    case 'week':
      return {
        since: midnight(now, today.sinceMonday + 7, timeZone),
        until: midnight(now, today.sinceMonday, timeZone),
      };
    case 'month': {
      const firstThis = `${today.y}-${String(today.m).padStart(2, '0')}-01`;
      const lastPrev = addDays(firstThis, -1);
      const since = dayStart(`${lastPrev.slice(0, 7)}-01`, timeZone);
      const until = dayStart(firstThis, timeZone);
      return since && until ? { since, until } : null;
    }
    case 'custom': {
      if (!range.from || !range.to) return null;
      const days = Math.round((Date.parse(range.to) - Date.parse(range.from)) / DAY_MS) + 1;
      const since = dayStart(addDays(range.from, -days), timeZone);
      const until = dayStart(range.from, timeZone);
      return since && until ? { since, until } : null;
    }
    default:
      return previousOrderRange(range.id, now, timeZone);
  }
}
