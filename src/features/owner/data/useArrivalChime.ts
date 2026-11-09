import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAudioPlayer } from 'expo-audio';
import { api } from '@/lib/api';
import { useOwnerSession } from '@/features/session';
import { chimeStep, type ChimeState } from '../desk/arrivals';
import { ownerKeys } from './keys';
import { useOwnerPrefs } from './ownerPrefs';
import { POLL_MS } from '@/lib/polling';

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
    refetchInterval: POLL_MS.owner,
  });
  const calls = useQuery({
    queryKey: ownerKeys.calls(venueId),
    queryFn: () => api.ownerListWaiterCalls(venueId),
    enabled: Boolean(venueId) && hearsCalls,
    refetchInterval: POLL_MS.owner,
  });

  const seen = useRef<ChimeState>({ orders: null, calls: null });
  // A new venue (location switch) starts fresh, so its existing orders don't ring.
  useEffect(() => {
    seen.current = { orders: null, calls: null };
  }, [venueId]);

  useEffect(() => {
    const step = chimeStep(seen.current, {
      // A switched-off query can still return cached data, so check the role here too.
      orderIds: hearsOrders && orders.data ? orders.data.items.map((order) => order.id) : null,
      // Only open calls ring; a call already answered elsewhere is not news.
      openCallIds:
        hearsCalls && calls.data
          ? calls.data.items.filter((call) => call.status === 'open').map((call) => call.id)
          : null,
      on,
    });
    seen.current = step.state;
    if (step.ring) {
      void player.seekTo(0);
      player.play();
    }
  }, [orders.data, calls.data, hearsOrders, hearsCalls, on, player]);
}
