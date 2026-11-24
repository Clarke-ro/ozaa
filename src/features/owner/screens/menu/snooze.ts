/**
 * "Sold out for a while" (MenuItem.snoozedUntil): the dish comes back by itself, so nobody has
 * to remember to switch it on after the rush. Times use the venue's own clock.
 */

export type SnoozeChoice = '1h' | '2h' | 'today';

const HOUR = 60 * 60 * 1000;

/** Hours, minutes and seconds on the venue's clock. Africa has no daylight saving to trip on. */
function clock(at: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(at));
  const n = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return n('hour') * 3600 + n('minute') * 60 + n('second');
}

/** When the snooze ends. "Rest of today" ends at the venue's next midnight. */
export function snoozeUntil(choice: SnoozeChoice, now: number, timeZone: string): string {
  if (choice === '1h') return new Date(now + HOUR).toISOString();
  if (choice === '2h') return new Date(now + 2 * HOUR).toISOString();
  const startOfToday = now - clock(now, timeZone) * 1000 - (now % 1000);
  return new Date(startOfToday + 24 * HOUR).toISOString();
}

const dayOf = (at: number, timeZone: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone, dateStyle: 'short' }).format(new Date(at));

/**
 * "17:00", or "Wed 00:00" when it isn't today, for the "Back at" label. Null when the dish
 * isn't snoozed now: no time, a time that has passed, or switched off until the owner says.
 */
export function backAt(
  item: { available: boolean; snoozedUntil?: string | null },
  now: number,
  timeZone: string,
): string | null {
  if (!item.available || !item.snoozedUntil) return null;
  const until = Date.parse(item.snoozedUntil);
  if (!(until > now)) return null;
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(until));
  if (dayOf(until, timeZone) === dayOf(now, timeZone)) return time;
  const day = new Intl.DateTimeFormat('en-GB', { timeZone, weekday: 'short' }).format(
    new Date(until),
  );
  return `${day} ${time}`;
}
