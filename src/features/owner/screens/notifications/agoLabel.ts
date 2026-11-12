import type { TFunction } from 'i18next';

/** "Just now", "4 min ago", "2 h ago", then the venue-clock time for older ones. */
export function agoLabel(t: TFunction, iso: string, now: number): string {
  const minutes = Math.max(0, Math.floor((now - Date.parse(iso)) / 60_000));
  if (minutes < 1) return t('ownerNotes.justNow');
  if (minutes < 60) return t('ownerNotes.minutesAgo', { count: minutes });
  return t('ownerNotes.hoursAgo', { count: Math.floor(minutes / 60) });
}
