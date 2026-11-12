import type { InsightsReport } from '@/lib/api/types';
import { ApiError } from '@/lib/api/errors';
import { insightsReport, rangeWindow } from '@/lib/insights';
import { venueById, type World } from './world';

/** Members who came back: two or more paid visits in the window, out of all who visited. */
function repeatGuestsIn(world: World, venueId: string, since: number, until: number) {
  const members = Object.values(world.loyalty[venueId]?.members ?? {});
  let visited = 0;
  let repeat = 0;
  for (const member of members) {
    const visits = member.facts.filter(
      (fact) =>
        fact.kind === 'earn' &&
        fact.source.type === 'paid_visit' &&
        Date.parse(fact.at) >= since &&
        Date.parse(fact.at) < until,
    ).length;
    if (visits > 0) visited += 1;
    if (visits > 1) repeat += 1;
  }
  return { count: repeat, sharePercent: visited === 0 ? 0 : Math.round((repeat / visited) * 100) };
}

export function insightsFor(
  world: World,
  venueId: string,
  range: InsightsReport['range'],
  now: number,
  window?: { since: string; until: string },
): InsightsReport {
  const venue = venueById(world, venueId);
  const timeZone = venue.hours.timezone;
  if (range === 'custom' && !window)
    throw new ApiError(400, 'bad_request', 'Pick a start and end date');
  const span =
    // A preset range runs up to and including this moment, so a visit made just now counts.
    range === 'custom' && window
      ? window
      : rangeWindow(range === 'custom' ? '7d' : range, now + 1, timeZone);
  const visits = [...world.sessions.values()].filter((visit) => visit.slug === venue.slug);
  const report = insightsReport({
    range,
    since: span.since,
    until: span.until,
    timeZone,
    orders: world.orders.map((row) => row.order).filter((order) => order.venueId === venueId),
    visits,
    feedback: world.feedback.filter((note) => note.venueId === venueId),
    repeatGuests: repeatGuestsIn(world, venueId, Date.parse(span.since), Date.parse(span.until)),
  });
  return { ...report, currency: venue.currency };
}
