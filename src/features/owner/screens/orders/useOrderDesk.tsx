import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { useOwnerSession } from '@/features/session';
import type { Order } from '@/lib/api/types';
import { DEFAULT_CURRENCY } from '@/lib/money';
import { POLL_MS } from '@/lib/polling';
import { ownerKeys } from '../../data/keys';
import { orderRange, type OrderRange } from '../../desk/orderRange';
import { MarkPaidSheet } from './MarkPaidSheet';
import { OrderCard } from './OrderCard';
import { useOrderMove } from './useOrderMove';
import { useVenuePay } from './useVenuePay';
import { useNow } from '@/lib/useNow';

// Only a safety net while the venue loads; every venue has a zone in its opening hours.
const FALLBACK_ZONE = 'Africa/Accra';
// Ticket ages only need to move once every half minute.
const TICK_MS = 30_000;

/**
 * Everything a page of tickets needs, shared by Orders and the one-stage page (New, Cooking,
 * Ready): the orders for a date range, the clock for ticket ages, the next-step mutation, and
 * the "Mark paid" sheet. `card` draws one ticket with all of that wired in.
 */
export function useOrderDesk(range: OrderRange, compact: boolean) {
  const router = useRouter();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const role = useOwnerSession((state) => state.role) ?? 'waiter';
  const [paying, setPaying] = useState<Order | null>(null);
  const now = useNow(TICK_MS);
  const { venue, methods } = useVenuePay(venueId);
  // The range's days start at midnight where the venue is, not where this phone is.
  const period = orderRange(range, now, venue.data?.hours.timezone ?? FALLBACK_ZONE);
  // "All time" shares the cache with the chime and Today; a range gets its own entry under it,
  // so any save that refreshes the orders refreshes this list too.
  const key = range === 'all' ? ownerKeys.orders(venueId) : [...ownerKeys.orders(venueId), range];
  const orders = useQuery({
    queryKey: key,
    queryFn: () => api.ownerListOrders(venueId, period),
    enabled: Boolean(venueId),
    refetchInterval: POLL_MS.owner,
  });
  const canCreate = role === 'owner' || role === 'manager' || role === 'waiter';
  const currency = venue.data?.currency ?? DEFAULT_CURRENCY;
  const move = useOrderMove(venueId, role);

  const card = (order: Order) => (
    <OrderCard
      key={order.id}
      order={order}
      now={now}
      currency={currency}
      next={move.label(order)}
      busy={move.busy(order)}
      onNext={() => move.run(order)}
      onOpen={() => router.push(`/owner/orders/${order.id}`)}
      onMarkPaid={canCreate ? () => setPaying(order) : undefined}
      compact={compact}
    />
  );
  const paySheet =
    paying && venue.data ? (
      <MarkPaidSheet
        order={paying}
        venueId={venueId}
        methods={methods}
        currency={venue.data.currency}
        onClose={() => setPaying(null)}
      />
    ) : null;

  return { venueId, venue, orders, canCreate, card, paySheet };
}
