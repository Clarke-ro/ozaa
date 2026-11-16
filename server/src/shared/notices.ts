// Generated from src/lib/notices.ts by scripts/sync-server-shared.mjs. Do not edit here.
import type { StoreNotice, StoreNotices } from './types.ts';

type Notice = Pick<StoreNotice, 'enabled' | 'text'> &
  Partial<Pick<StoreNotice, 'title' | 'startsAt' | 'endsAt'>>;

/**
 * Should guests see this notice at `now`? Switched on, has words, and inside its times. The
 * server sends only live notices; the guest app checks again because a cached venue page can be
 * hours old, and an "Open late tonight" banner must not show the next morning.
 */
export function isNoticeLive(notice: Notice | null | undefined, now: number): boolean {
  if (!notice?.enabled || !notice.text.trim()) return false;
  if (notice.startsAt && Date.parse(notice.startsAt) > now) return false;
  if (notice.endsAt && Date.parse(notice.endsAt) <= now) return false;
  return true;
}

/** The banner and popup guests should see right now; anything else becomes null. */
export function liveNotices(
  notices: StoreNotices | null | undefined,
  now: number,
): { banner: StoreNotice | null; popup: StoreNotice | null } {
  const banner = notices?.banner ?? null;
  const popup = notices?.popup ?? null;
  return {
    banner: isNoticeLive(banner, now) ? banner : null,
    popup: isNoticeLive(popup, now) ? popup : null,
  };
}

/**
 * Identifies one version of a popup, so a guest who closed it isn't shown it again, but sees it
 * once more if the owner changes it. Built from what the guest reads, so no id is needed.
 */
export function noticeKey(notice: Notice): string {
  return [notice.title ?? '', notice.text, notice.startsAt ?? ''].join('|');
}
