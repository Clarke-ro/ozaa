// Generated from src/lib/insights.ts by scripts/sync-server-shared.mjs. Do not edit here.
import type { FeedbackSentiment, InsightsReport, Order } from './types.ts';

const DAY = 86_400_000;

type Range = InsightsReport['range'];
type InsightsOrder = Pick<Order, 'createdAt' | 'status' | 'totalPesewas'> & {
  lines: { name: string; quantity: number; totalPesewas: number }[];
};
/** One guest visit: a QR scan or an opened menu link. No guest is identified. */
export type Visit = { startedAt: string; menuOpenedAt?: string; orderedAt?: string };

/** Parts of a moment on the venue's clock. */
function venueParts(at: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(at));
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {
    y: get('year'),
    m: get('month'),
    d: get('day'),
    h: get('hour'),
    min: get('minute'),
    s: get('second'),
  };
}

/** The UTC moment of midnight at the start of the venue's day that contains `at`. */
export function venueMidnight(at: number, timeZone: string): number {
  const p = venueParts(at, timeZone);
  // The venue's wall clock read as UTC, minus the real moment, is the zone's offset right now.
  const offset = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s) - (at - (at % 1000));
  return Date.UTC(p.y, p.m - 1, p.d) - offset;
}

/** The window a range covers, ending now. 7d means today and the 6 days before it. */
export function rangeWindow(range: Exclude<Range, 'custom'>, now: number, timeZone: string) {
  const days = range === 'today' ? 1 : range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const since = venueMidnight(now, timeZone) - (days - 1) * DAY;
  return { since: new Date(since).toISOString(), until: new Date(now).toISOString() };
}

const hourOf = (iso: string, timeZone: string) => venueParts(Date.parse(iso), timeZone).h;

function dayLabel(at: number, timeZone: string): string {
  const p = venueParts(at, timeZone);
  return `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;
}

/**
 * The Insights page from real records: visits, orders and feedback inside [since, until).
 * Empty buckets stay in the series as zeros, so a quiet week draws a flat line, not a gap.
 */
export function insightsReport(input: {
  range: Range;
  since: string;
  until: string;
  timeZone: string;
  orders: readonly InsightsOrder[];
  visits: readonly Visit[];
  feedback: readonly { sentiment: FeedbackSentiment; createdAt: string }[];
  repeatGuests?: { count: number; sharePercent: number };
  sample?: boolean;
}): Omit<InsightsReport, 'currency'> {
  const since = Date.parse(input.since);
  const until = Date.parse(input.until);
  const inside = (iso: string | undefined) =>
    iso !== undefined && Date.parse(iso) >= since && Date.parse(iso) < until;
  const tz = input.timeZone;

  const visits = input.visits.filter((visit) => inside(visit.startedAt));
  const hourly = new Map<number, number>();
  for (const visit of visits)
    hourly.set(hourOf(visit.startedAt, tz), (hourly.get(hourOf(visit.startedAt, tz)) ?? 0) + 1);

  const orders = input.orders.filter(
    (order) => order.status !== 'cancelled' && inside(order.createdAt),
  );
  const buckets = new Map<string, number>();
  const labels: string[] = [];
  if (input.range === 'today') {
    for (let h = 0; h <= hourOf(new Date(until - 1).toISOString(), tz); h += 1)
      labels.push(String(h));
  } else {
    for (let at = since; at < until; at += DAY) labels.push(dayLabel(at, tz));
  }
  for (const label of labels) buckets.set(label, 0);
  const items = new Map<string, { count: number; pesewas: number }>();
  const peaks = new Map<number, number>();
  let salesPesewas = 0;
  for (const order of orders) {
    salesPesewas += order.totalPesewas;
    const key =
      input.range === 'today'
        ? String(hourOf(order.createdAt, tz))
        : dayLabel(Date.parse(order.createdAt), tz);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + order.totalPesewas);
    const hour = hourOf(order.createdAt, tz);
    peaks.set(hour, (peaks.get(hour) ?? 0) + 1);
    for (const line of order.lines) {
      const item = items.get(line.name) ?? { count: 0, pesewas: 0 };
      items.set(line.name, {
        count: item.count + line.quantity,
        pesewas: item.pesewas + line.totalPesewas,
      });
    }
  }

  const mood = { positive: 0, neutral: 0, negative: 0 };
  for (const note of input.feedback) if (inside(note.createdAt)) mood[note.sentiment] += 1;

  return {
    range: input.range,
    since: new Date(since).toISOString(),
    until: new Date(until).toISOString(),
    salesPesewas,
    sample: input.sample ?? false,
    scansCount: visits.length,
    menuViewsCount: visits.filter((visit) => visit.menuOpenedAt).length,
    ordersCount: visits.filter((visit) => visit.orderedAt).length,
    visitsByHour: [...hourly]
      .map(([hour, count]) => ({ hour, visits: count }))
      .sort((a, b) => a.hour - b.hour),
    mood,
    series: labels.map((label) => ({ label, pesewas: buckets.get(label) ?? 0 })),
    topItems: [...items]
      .map(([name, value]) => ({ name, ...value }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
    peakHours: [...peaks]
      .map(([hour, count]) => ({ hour, orders: count }))
      .sort((a, b) => a.hour - b.hour),
    repeatGuests: input.repeatGuests ?? { count: 0, sharePercent: 0 },
  };
}
