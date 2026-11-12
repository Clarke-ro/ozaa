import { formatWhen, parseWhen } from './noticeForm';

export type OrderRange = 'all' | 'today' | 'yesterday' | '7d' | '30d';
export const ORDER_RANGES: readonly OrderRange[] = ['today', 'yesterday', '7d', '30d', 'all'];

const DAY_MS = 24 * 60 * 60 * 1000;

/** Midnight at the start of the venue's calendar day that is `daysBack` days before `now`. */
export function midnight(now: number, daysBack: number, timeZone: string): string {
  // The venue's date today, e.g. "2026-11-04", then step back whole days on the calendar.
  const today = formatWhen(new Date(now).toISOString(), timeZone).slice(0, 10);
  const [y, m, d] = today.split('-').map(Number) as [number, number, number];
  const day = new Date(Date.UTC(y, m - 1, d) - daysBack * DAY_MS).toISOString().slice(0, 10);
  const parsed = parseWhen(`${day} 00:00`, timeZone);
  // A date we just built always parses; the fallback only keeps the types honest.
  return parsed.ok && parsed.iso ? parsed.iso : new Date(now).toISOString();
}

/**
 * The since/until to ask the server for. Days start at midnight in the venue's time zone, so
 * "Today" in Accra means the same thing on every staff phone. Ranges end open, so new orders
 * keep appearing while the screen is up.
 */
export function orderRange(
  range: OrderRange,
  now: number,
  timeZone: string,
): { since?: string; until?: string } {
  switch (range) {
    case 'all':
      return {};
    case 'today':
      return { since: midnight(now, 0, timeZone) };
    case 'yesterday':
      return { since: midnight(now, 1, timeZone), until: midnight(now, 0, timeZone) };
    case '7d':
      return { since: midnight(now, 6, timeZone) };
    case '30d':
      return { since: midnight(now, 29, timeZone) };
  }
}
