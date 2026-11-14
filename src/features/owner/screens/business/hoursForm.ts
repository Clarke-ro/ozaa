import type { OpeningHours } from '@/lib/api/types';

/** One day as the owner edits it: open or closed, and the times as typed. */
export type DayDraft = { open: boolean; opens: string; closes: string };

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** The week from the venue, Monday first. A day with no slots is closed; one slot is edited. */
export function daysFrom(hours: OpeningHours | undefined): DayDraft[] {
  return Array.from({ length: 7 }, (_, i) => {
    const slot = hours?.weekly[i]?.[0];
    return slot
      ? { open: true, opens: slot.opens, closes: slot.closes }
      : { open: false, opens: '', closes: '' };
  });
}

/** Back to the API shape, or the first day (0 is Monday) whose times aren't like 09:00. */
export function weeklyFrom(
  days: readonly DayDraft[],
): { ok: true; weekly: OpeningHours['weekly'] } | { ok: false; day: number } {
  const weekly: OpeningHours['weekly'] = [];
  for (const [i, day] of days.entries()) {
    if (!day.open) {
      weekly.push([]);
      continue;
    }
    if (!TIME.test(day.opens) || !TIME.test(day.closes)) return { ok: false, day: i };
    weekly.push([{ opens: day.opens, closes: day.closes }]);
  }
  return { ok: true, weekly };
}

type Closure = NonNullable<OpeningHours['exceptions']>[number];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** True for a real calendar date written like 2026-12-25. */
export function isDate(text: string): boolean {
  if (!DATE.test(text)) return false;
  const day = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(day.getTime()) && day.toISOString().slice(0, 10) === text;
}

/** The closed days with one more, in date order, never twice. Returns null for a bad date. */
export function addClosedDay(list: readonly Closure[], date: string): Closure[] | null {
  if (!isDate(date)) return null;
  const rest = list.filter((c) => c.date !== date);
  return [...rest, { date, closed: true }].sort((a, b) => a.date.localeCompare(b.date));
}

/** Today's hours as "11:00 to 22:00", or null when closed. Day 0 is Monday, like the contract. */
export function hoursOn(hours: OpeningHours | undefined, now: Date): string | null {
  // getDay() counts from Sunday; the contract's week starts on Monday.
  const slot = hours?.weekly[(now.getDay() + 6) % 7]?.[0];
  return slot ? `${slot.opens} to ${slot.closes}` : null;
}
