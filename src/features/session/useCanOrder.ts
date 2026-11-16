import { onlineOrderingOf } from '@/lib/onlineOrdering';
import type { VenuePublic } from '@/lib/api/types';
import { useGuestSession } from './sessionStore';

/**
 * Whether this guest can put dishes in a basket here. At a table they scanned: always. From the
 * venue's own link: only when the venue takes online orders; otherwise the menu is to browse, so
 * nobody builds a basket the kitchen can't take. The server still checks every order.
 */
export function canOrderHere(
  atTable: boolean,
  venue: Pick<VenuePublic, 'onlineOrdering'> | undefined,
): boolean {
  return atTable || onlineOrderingOf(venue?.onlineOrdering).enabled;
}

export function useAtTable(slug: string): boolean {
  return useGuestSession((state) => state.slug === slug && Boolean(state.tableCode));
}
