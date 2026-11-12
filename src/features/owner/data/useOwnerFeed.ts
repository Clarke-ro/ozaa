import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { OwnerNotification } from '@/lib/api/types';
import { useOwnerSession } from '@/features/session';
import { POLL_MS } from '@/lib/polling';
import { ownerKeys } from './keys';

/**
 * The venue's notification feed from the server: the same records the queues use, so the
 * screen, the sidebar count, the phone bell and "Needs you" on Today always agree.
 */
export function useOwnerFeed() {
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  return useQuery({
    queryKey: ownerKeys.notifications(venueId),
    queryFn: () => api.ownerListNotifications(venueId),
    enabled: Boolean(venueId),
    refetchInterval: POLL_MS.ownerNotifications,
  });
}

/** Mark some notifications (or, with no ids, all of them) read for the signed-in person. */
export function useMarkRead() {
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const client = useQueryClient();
  return useMutation({
    mutationFn: (ids?: string[]) => api.ownerMarkNotificationsRead(venueId, ids),
    onSuccess: () => void client.invalidateQueries({ queryKey: ownerKeys.notifications(venueId) }),
  });
}

/** Where a notification opens. A call opens its own page; a guest note opens Feedback. */
export function feedHref(item: OwnerNotification): string {
  const { type, id } = item.target;
  if (type === 'order') return `/owner/orders/${id}`;
  if (type === 'call') return `/owner/calls/${id}`;
  if (type === 'table') return `/owner/floor?table=${id}`;
  if (type === 'review') return '/owner/reviews';
  return '/owner/feedback';
}
