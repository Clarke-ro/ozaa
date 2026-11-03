import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAudioPlayer } from 'expo-audio';
import { api } from '@/lib/api';
import { useOwnerSession } from '@/features/session';
import { arrivals } from '../desk/arrivals';
import { ownerKeys } from './keys';
import { useOwnerPrefs } from './ownerPrefs';

// Same pace as the Orders and Calls screens, and the same cache keys, so this adds no extra calls.
const LIVE_MS = 5000;
const CHIME = require('../../../../assets/sounds/new-order.wav');

/**
 * Rings once when new orders or waiter calls arrive, on any owner screen, while the app is open.
 * Kitchen staff hear orders only; waiters, managers and owners hear calls too.
 * Browsers only allow sound after someone has tapped the page, which signing in already does.
 */
export function useArrivalChime() {
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const role = useOwnerSession((state) => state.role);
  const on = useOwnerPrefs((state) => state.chime);
  const hearsOrders =
    role === 'owner' || role === 'manager' || role === 'waiter' || role === 'kitchen';
  const hearsCalls = role === 'owner' || role === 'manager' || role === 'waiter';
  const player = useAudioPlayer(CHIME);

  const orders = useQuery({
    queryKey: ownerKeys.orders(venueId),
    queryFn: () => api.ownerListOrders(venueId),
    enabled: Boolean(venueId) && hearsOrders,
    refetchInterval: LIVE_MS,
  });
  const calls = useQuery({
    queryKey: ownerKeys.calls(venueId),
    queryFn: () => api.ownerListWaiterCalls(venueId),
    enabled: Boolean(venueId) && hearsCalls,
    refetchInterval: LIVE_MS,
  });

  const seenOrders = useRef<Set<string> | null>(null);
  const seenCalls = useRef<Set<string> | null>(null);
  // A new venue (location switch) starts fresh, so its existing orders don't ring.
  useEffect(() => {
    seenOrders.current = null;
    seenCalls.current = null;
  }, [venueId]);

  useEffect(() => {
    let fresh = 0;
    // A switched-off query can still return cached data, so check the role here too.
    if (orders.data && hearsOrders) {
      const next = arrivals(
        seenOrders.current,
        orders.data.items.map((order) => order.id),
      );
      seenOrders.current = next.seen;
      fresh += next.fresh;
    }
    if (calls.data && hearsCalls) {
      // Only open calls ring; a call that was already answered elsewhere is not news.
      const open = calls.data.items.filter((call) => call.status === 'open');
      const next = arrivals(
        seenCalls.current,
        open.map((call) => call.id),
      );
      seenCalls.current = next.seen;
      fresh += next.fresh;
    }
    if (fresh > 0 && on) {
      void player.seekTo(0);
      player.play();
    }
  }, [orders.data, calls.data, hearsOrders, hearsCalls, on, player]);
}
