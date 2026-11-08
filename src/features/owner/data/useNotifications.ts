import { useQuery } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { api } from '@/lib/api';
import { PAYMENTS_ENABLED } from '@/lib/features';
import { useOwnerSession } from '@/features/session';
import { buildNotifications, unseenCount, type Note } from '../desk/notifications';
import { ownerKeys } from './keys';

// The feed refreshes as often as the busiest screen it draws from (orders and calls).
const LIVE_MS = 15_000;

type SeenState = {
  /** When the owner last opened Notifications, per venue. Kept on this device only. */
  seen: Record<string, number>;
  markSeen: (venueId: string, at: number) => void;
};

export const useNotesSeen = create<SeenState>()(
  persist(
    (set) => ({
      seen: {},
      markSeen: (venueId, at) => set((s) => ({ seen: { ...s.seen, [venueId]: at } })),
    }),
    { name: 'cravins-owner-notes-seen', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

/**
 * Everything the Notifications screen and the bell need. It reads the same caches as the
 * Orders, Calls, Feedback, Payments and Staff screens, so opening one warms the other.
 */
export function useNotifications(): {
  notes: Note[];
  /** The time the feed was built for (latest fetch), for "5 minutes ago". */
  now: number;
  unseen: number;
  lastSeen: number | null;
  loading: boolean;
  error: boolean;
  refetch: () => void;
} {
  const venueId = useOwnerSession((s) => s.venueId) ?? '';
  const lastSeen = useNotesSeen((s) => s.seen[venueId] ?? null);
  const on = Boolean(venueId);
  const opts = { enabled: on, refetchInterval: LIVE_MS } as const;
  const orders = useQuery({
    queryKey: ownerKeys.orders(venueId),
    queryFn: () => api.ownerListOrders(venueId),
    ...opts,
  });
  const calls = useQuery({
    queryKey: ownerKeys.calls(venueId),
    queryFn: () => api.ownerListWaiterCalls(venueId),
    ...opts,
  });
  const feedback = useQuery({
    queryKey: [...ownerKeys.feedback(venueId), 'new', ''],
    queryFn: () => api.ownerListFeedback(venueId, { state: 'new' }),
    ...opts,
  });
  const txs = useQuery({
    queryKey: ownerKeys.transactions(venueId),
    queryFn: () => api.ownerListTransactions(venueId),
    ...opts,
    // Payments off: no transactions to read, so the feed never shows payment lines.
    enabled: on && PAYMENTS_ENABLED,
  });
  const staff = useQuery({
    queryKey: ownerKeys.staff(venueId),
    queryFn: () => api.ownerListStaff(venueId),
    ...opts,
  });
  const desk = useQuery({
    queryKey: ownerKeys.dashboard(venueId),
    queryFn: () => api.ownerGetDashboard(venueId),
    ...opts,
  });

  const all = [orders, calls, feedback, ...(PAYMENTS_ENABLED ? [txs] : []), staff, desk];
  // "Now" is the latest fetch time, so the feed moves on with every refresh.
  const now = Math.max(0, ...all.map((q) => q.dataUpdatedAt));
  const notes = buildNotifications(
    {
      orders: orders.data?.items ?? [],
      calls: calls.data?.items ?? [],
      feedback: feedback.data?.items ?? [],
      transactions: txs.data?.items ?? [],
      staff: staff.data?.items ?? [],
      alerts: desk.data?.alerts ?? [],
    },
    now,
  );
  return {
    notes,
    now,
    unseen: unseenCount(notes, lastSeen),
    lastSeen,
    loading: all.some((q) => q.isLoading),
    error: all.every((q) => q.isError),
    refetch: () => all.forEach((q) => void q.refetch()),
  };
}
