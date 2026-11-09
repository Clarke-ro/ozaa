import { midnight, type OrderRange } from './orderRange';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The window just before `range`, the same length, so Sales can say "12% more than the
 * previous 7 days". "Today" (still running) compares with the whole of yesterday. All time has
 * nothing before it.
 */
export function previousOrderRange(
  range: OrderRange,
  now: number,
  timeZone: string,
): { since: string; until: string } | null {
  const window = (from: number, to: number) => ({
    since: midnight(now, from, timeZone),
    until: midnight(now, to, timeZone),
  });
  switch (range) {
    case 'all':
      return null;
    case 'today':
      return window(1, 0);
    case 'yesterday':
      return window(2, 1);
    case '7d':
      return window(13, 6);
    case '30d':
      return window(59, 29);
  }
}

/** Whole-percent change from `before` to `now`. Null when there was nothing before. */
export function percentChange(now: number, before: number): number | null {
  if (before <= 0) return null;
  return Math.round(((now - before) / before) * 100);
}

type Day = { date: string; pesewas: number };

/**
 * Every calendar day from `from` to `to` (YYYY-MM-DD), with zero on days that had no orders, so
 * a chart shows quiet days as gaps instead of skipping them. Without a range (all time) it keeps
 * only the days the server sent, oldest first.
 */
export function fillDays(days: readonly Day[], from: string | null, to: string | null): Day[] {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  if (!from || !to) return sorted;
  const byDate = new Map(sorted.map((d) => [d.date, d.pesewas]));
  const out: Day[] = [];
  for (let t = Date.parse(`${from}T00:00:00Z`); t <= Date.parse(`${to}T00:00:00Z`); t += DAY_MS) {
    const date = new Date(t).toISOString().slice(0, 10);
    out.push({ date, pesewas: byDate.get(date) ?? 0 });
  }
  return out;
}
