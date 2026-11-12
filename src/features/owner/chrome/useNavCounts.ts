import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useOwnerSession } from '@/features/session';
import { ownerKeys } from '../data/keys';
import { navFor, type OwnerNavId } from './nav';
import { POLL_MS } from '@/lib/polling';
import { useOwnerFeed } from '../data/useOwnerFeed';

/**
 * Small numbers in the sidebar and tab bar: orders waiting for the kitchen, open waiter calls
 * (from the dashboard, the same figures Today shows) and this person's unread notifications.
 */
export function useNavCounts(): Partial<Record<OwnerNavId, number>> {
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const role = useOwnerSession((state) => state.role) ?? 'waiter';
  const allowed = navFor(role).some((item) => item.id === 'dashboard');
  const desk = useQuery({
    queryKey: ownerKeys.dashboard(venueId),
    queryFn: () => api.ownerGetDashboard(venueId),
    enabled: Boolean(venueId) && allowed,
    refetchInterval: POLL_MS.owner,
  });
  const feed = useOwnerFeed();
  const unread = feed.data?.unreadCount;
  if (!allowed || !desk.data) return unread ? { notifications: unread } : {};
  return { orders: desk.data.pendingOrders, calls: desk.data.openCalls, notifications: unread };
}
