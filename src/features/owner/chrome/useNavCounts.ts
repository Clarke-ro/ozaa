import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useOwnerSession } from '@/features/session';
import { ownerKeys } from '../data/keys';
import { navFor, type OwnerNavId } from './nav';

// Same pace and cache key as Today, so the sidebar adds no extra calls while Today is open.
const LIVE_MS = 5000;

/**
 * Small numbers next to Orders and Calls in the sidebar and tab bar: orders waiting for the
 * kitchen and open waiter calls. Read from the dashboard, so only people who may see it get counts.
 */
export function useNavCounts(): Partial<Record<OwnerNavId, number>> {
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const role = useOwnerSession((state) => state.role) ?? 'waiter';
  const allowed = navFor(role).some((item) => item.id === 'dashboard');
  const desk = useQuery({
    queryKey: ownerKeys.dashboard(venueId),
    queryFn: () => api.ownerGetDashboard(venueId),
    enabled: Boolean(venueId) && allowed,
    refetchInterval: LIVE_MS,
  });
  if (!allowed || !desk.data) return {};
  return { orders: desk.data.pendingOrders, calls: desk.data.openCalls };
}
