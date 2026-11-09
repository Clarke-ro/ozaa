import { useQueries, useQuery } from '@tanstack/react-query';
import { create } from 'zustand';
import { api } from '@/lib/api';
import { useGuestSession, useMyCalls } from '@/features/session';
import { buildGuestNotes, unseenGuestNotes, type GuestNote } from './guestNotes';
import { guestKeys } from '@/lib/queryKeys';
import { POLL_MS } from '@/lib/polling';

/** When the guest last opened Notifications, for this visit. */
export const useGuestNotesSeen = create<{ at: number | null; mark: (at: number) => void }>(
  (set) => ({ at: null, mark: (at) => set({ at }) }),
);

/** The guest's notifications and how many are new. Reads the same caches as Status and Call waiter. */
export function useGuestNotes(slug: string): { notes: GuestNote[]; unseen: number } {
  const orderId = useGuestSession((s) => (s.slug === slug ? s.orderId : null));
  const callIds = useMyCalls((s) => s.ids);
  const seen = useGuestNotesSeen((s) => s.at);
  const order = useQuery({
    queryKey: guestKeys.order(orderId),
    queryFn: () => api.getOrder(orderId ?? ''),
    enabled: Boolean(orderId),
    refetchInterval: POLL_MS.guest,
  });
  const calls = useQueries({
    queries: callIds.map((id) => ({
      queryKey: guestKeys.waiterCall(id),
      queryFn: () => api.getWaiterCall(id),
      refetchInterval: POLL_MS.guest,
    })),
  });
  const notes = buildGuestNotes({
    order: order.data ?? null,
    calls: calls.flatMap((q) => (q.data ? [q.data] : [])),
  });
  return { notes, unseen: unseenGuestNotes(notes, seen) };
}
