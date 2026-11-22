/** The next calendar date after `day` (`YYYY-MM-DD`), ignoring time zones and clocks. */
export function nextCalendarDay(day: string): string {
  const [year, month, date] = day.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month - 1, date + 1)).toISOString().slice(0, 10);
}

/**
 * UTC instant of midnight at the start of `day` in `timeZone`.
 * Used so "today" in the database matches `calendarDay` in the app, including zones that shift.
 */
export function zonedMidnight(day: string, timeZone: string): number {
  const [year, month, date] = day.split('-').map(Number) as [number, number, number];
  const utcGuess = Date.UTC(year, month - 1, date);
  const offset = zoneOffsetMs(utcGuess, timeZone);
  let instant = utcGuess - offset;
  const offsetAtMidnight = zoneOffsetMs(instant, timeZone);
  if (offsetAtMidnight !== offset) instant = utcGuess - offsetAtMidnight;
  return instant;
}

/** `[start, end)` of that calendar day in the zone, as Dates Postgres can compare. */
export function zonedDayRange(day: string, timeZone: string): { start: Date; end: Date } {
  return {
    start: new Date(zonedMidnight(day, timeZone)),
    end: new Date(zonedMidnight(nextCalendarDay(day), timeZone)),
  };
}

/** How far ahead of UTC the zone is at `instant`, in milliseconds. */
function zoneOffsetMs(instant: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(instant));
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  // Some engines print midnight as hour 24. That is still the start of the named day.
  const asUtc = Date.UTC(
    value('year'),
    value('month') - 1,
    value('day'),
    value('hour') % 24,
    value('minute'),
    value('second'),
  );
  return asUtc - instant;
}
