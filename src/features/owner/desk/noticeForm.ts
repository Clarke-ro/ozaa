import type { StoreNotice } from '@/lib/api/types';

/** What the owner types for one notice. Times are "YYYY-MM-DD HH:MM" in the venue's time zone. */
export type NoticeDraft = {
  enabled: boolean;
  title: string;
  text: string;
  starts: string;
  ends: string;
};

// The contract's limits (StoreNotice.text and title).
const TEXT_MAX = 280;
const TITLE_MAX = 60;

const WHEN = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/;

/** The wall-clock parts of a moment in a time zone, e.g. 18:30 in Accra. */
function partsIn(ms: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(ms));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { y: get('year'), mo: get('month'), d: get('day'), h: get('hour'), mi: get('minute') };
}

/**
 * "2026-11-04 18:30" in the venue's zone → an ISO time. We guess the moment as if it were UTC,
 * see what clock time that is in the venue's zone, and move by the difference. Ghana has no
 * daylight saving, but venues elsewhere might, so this never assumes a fixed offset.
 */
export function parseWhen(
  text: string,
  timeZone: string,
): { ok: true; iso: string | null } | { ok: false } {
  const trimmed = text.trim();
  if (!trimmed) return { ok: true, iso: null };
  const match = WHEN.exec(trimmed);
  if (!match) return { ok: false };
  const [y, mo, d, h, mi] = match.slice(1).map(Number) as [number, number, number, number, number];
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) return { ok: false };
  const wanted = Date.UTC(y, mo - 1, d, h, mi);
  const seen = partsIn(wanted, timeZone);
  const offset = Date.UTC(seen.y, seen.mo - 1, seen.d, seen.h, seen.mi) - wanted;
  const ms = wanted - offset;
  // A date like 31 February rolls over; refuse it rather than save a different day.
  const back = partsIn(ms, timeZone);
  if (back.y !== y || back.mo !== mo || back.d !== d) return { ok: false };
  return { ok: true, iso: new Date(ms).toISOString() };
}

/** An ISO time → "2026-11-04 18:30" in the venue's zone, for the form. */
export function formatWhen(iso: string, timeZone: string): string {
  const p = partsIn(Date.parse(iso), timeZone);
  const two = (n: number) => String(n).padStart(2, '0');
  return `${p.y}-${two(p.mo)}-${two(p.d)} ${two(p.h)}:${two(p.mi)}`;
}

/** Fills the form from a saved notice (or an empty, switched-off one). */
export function draftOf(notice: StoreNotice | null | undefined, timeZone: string): NoticeDraft {
  return {
    enabled: notice?.enabled ?? false,
    title: notice?.title ?? '',
    text: notice?.text ?? '',
    starts: notice?.startsAt ? formatWhen(notice.startsAt, timeZone) : '',
    ends: notice?.endsAt ? formatWhen(notice.endsAt, timeZone) : '',
  };
}

export type NoticeCheck =
  | { ok: true; notice: StoreNotice | null }
  | { ok: false; field: 'title' | 'text' | 'starts' | 'ends' };

/**
 * Turns the form into what we save. A notice that is off and empty saves as null (nothing to
 * keep). One that is off but has words is kept, so the owner can switch it back on later.
 */
export function checkNotice(draft: NoticeDraft, timeZone: string): NoticeCheck {
  const text = draft.text.trim();
  const title = draft.title.trim();
  if (!draft.enabled && !text) return { ok: true, notice: null };
  if (!text || text.length > TEXT_MAX) return { ok: false, field: 'text' };
  if (title.length > TITLE_MAX) return { ok: false, field: 'title' };
  const starts = parseWhen(draft.starts, timeZone);
  if (!starts.ok) return { ok: false, field: 'starts' };
  const ends = parseWhen(draft.ends, timeZone);
  if (!ends.ok) return { ok: false, field: 'ends' };
  if (starts.iso && ends.iso && Date.parse(ends.iso) <= Date.parse(starts.iso))
    return { ok: false, field: 'ends' };
  return {
    ok: true,
    notice: {
      enabled: draft.enabled,
      ...(title ? { title } : {}),
      text,
      startsAt: starts.iso,
      endsAt: ends.iso,
    },
  };
}

const two = (n: number) => String(n).padStart(2, '0');

/** The next `count` days, starting today in the venue's zone, as "2026-11-14". */
export function dayOptions(now: number, timeZone: string, count: number): string[] {
  const today = partsIn(now, timeZone);
  // Count calendar days from noon UTC, so no clock change can skip or repeat a day.
  const start = Date.UTC(today.y, today.mo - 1, today.d, 12);
  return Array.from({ length: count }, (_, i) =>
    new Date(start + i * 86_400_000).toISOString().slice(0, 10),
  );
}

/** Every half hour of a day, "00:00" to "23:30". */
export function timeOptions(): string[] {
  return Array.from({ length: 48 }, (_, i) => `${two(Math.floor(i / 2))}:${i % 2 ? '30' : '00'}`);
}

/** "Today, 18:00", "Tomorrow, 09:30" or "Fri 20 Nov, 12:00" for a picked time; "" when unset. */
export function whenLabel(
  text: string,
  now: number,
  timeZone: string,
  words: { today: string; tomorrow: string },
  locale: string,
): string {
  const match = WHEN.exec(text.trim());
  if (!match) return '';
  const date = text.trim().slice(0, 10);
  const clock = text.trim().slice(11);
  const [today, tomorrow] = dayOptions(now, timeZone, 2);
  if (date === today) return `${words.today}, ${clock}`;
  if (date === tomorrow) return `${words.tomorrow}, ${clock}`;
  // Ghana writes dates the British way ("Fri 20 Nov"), so plain English uses en-GB.
  const day = new Date(`${date}T12:00:00Z`).toLocaleDateString(locale === 'en' ? 'en-GB' : locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
  return `${day}, ${clock}`;
}
