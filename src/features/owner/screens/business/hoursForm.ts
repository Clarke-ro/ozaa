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
