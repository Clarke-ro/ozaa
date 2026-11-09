import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ClipboardList } from 'lucide-react-native';
import { api } from '@/lib/api';
import { useOwnerSession } from '@/features/session';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { ownerKeys } from '../../data/keys';
import { orderTab, orderTabCounts, type OrderView } from '../../desk/ops';
import { DEFAULT_CURRENCY } from '@/lib/money';
import { EmptyCard, PeriodSelect } from '../../kit';
import { Button } from '@/ui/Button';
import { tokens } from '@/theme/tokens';
import { ORDER_RANGES, orderRange, type OrderRange } from '../../desk/orderRange';
import { CreateOrderSheet } from './CreateOrderSheet';
import { MarkPaidSheet, inPersonMethods } from './MarkPaidSheet';
import type { Order } from '@/lib/api/types';
import { guestKeys } from '@/lib/queryKeys';
import { OpenCalls } from './OpenCalls';
import { OrderCard } from './OrderCard';
import { OrdersToolbar } from './OrdersToolbar';
import { TicketGrid } from './TicketGrid';
import { useOrderMove } from './useOrderMove';

const LIVE: OrderView[] = ['new', 'cooking', 'ready'];
// Only a safety net while the venue loads; every venue has a zone in its opening hours.
const FALLBACK_ZONE = 'Africa/Accra';
// Ticket ages only need to move once every half minute.
const TICK_MS = 30_000;

/** Kitchen tickets by stage. Each ticket shows only the next step this person is allowed to take. */
export function OrdersScreen() {
  const { t } = useTranslation();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const role = useOwnerSession((state) => state.role) ?? 'waiter';
  // Null until staff pick a stage; until then show the first stage that has tickets.
  const [picked, setPicked] = useState<OrderView | null>(null);
  const [range, setRange] = useState<OrderRange>('all');
  const [creating, setCreating] = useState(false);
  const [paying, setPaying] = useState<Order | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);
  const venue = useQuery({
    queryKey: ownerKeys.venue(venueId),
    queryFn: () => api.ownerGetVenue(venueId),
    enabled: Boolean(venueId),
  });
  // The range's days start at midnight where the venue is, not where this phone is.
  const filter = orderRange(range, now, venue.data?.hours.timezone ?? FALLBACK_ZONE);
  // "All time" shares the cache with the chime and Today; a range gets its own entry under it,
  // so any save that refreshes the orders refreshes this list too.
  const key = range === 'all' ? ownerKeys.orders(venueId) : [...ownerKeys.orders(venueId), range];
  const orders = useQuery({
    queryKey: key,
    queryFn: () => api.ownerListOrders(venueId, filter),
    enabled: Boolean(venueId),
    refetchInterval: 5000,
  });
  const canCreate = role === 'owner' || role === 'manager' || role === 'waiter';
  // What guests can pay with is on the public venue, so waiters can read it too (no keys in it).
  const slug = venue.data?.slug ?? '';
  const publicVenue = useQuery({
    queryKey: guestKeys.venue(slug),
    queryFn: () => api.getVenue(slug),
    enabled: Boolean(slug),
  });

  const move = useOrderMove(venueId, role);

  const all = orders.data?.items ?? [];
  const counts = orderTabCounts(all);
  const tab = picked ?? LIVE.find((id) => counts[id] > 0) ?? 'new';
  const live = LIVE.includes(tab);
  // Oldest first in the live tabs (who has waited longest), newest first once done.
  const shown = all
    .filter((o) => tab === 'all' || orderTab(o.status) === tab)
    .sort((a, b) =>
      !live ? b.createdAt.localeCompare(a.createdAt) : a.createdAt.localeCompare(b.createdAt),
    );

  return (
    <OwnerPage
      title={t('owner.orders')}
      subtitle={t('ownerOrders.lead')}
      width="wide"
      action={
        <View style={styles.actions}>
          <PeriodSelect<OrderRange>
            label={t('ownerOrders.range.label')}
            value={range}
            onChange={setRange}
            options={ORDER_RANGES.map((id) => ({ id, label: t(`ownerOrders.range.${id}`) }))}
          />
          {canCreate && venue.data ? (
            <Button
              label={t('ownerOrders.create.open')}
              size="md"
              onPress={() => setCreating(true)}
            />
          ) : null}
        </View>
      }
    >
      <OpenCalls now={now} />
      <OrdersToolbar tab={tab} counts={counts} onTab={setPicked} />
      <DeskWait
        loading={orders.isLoading}
        error={orders.isError}
        onRetry={() => void orders.refetch()}
      >
        {shown.length === 0 ? (
          <EmptyCard
            icon={ClipboardList}
            title={t(`ownerOrders.empty.${tab}`)}
            description={t('ownerOrders.emptyBody')}
          />
        ) : (
          <TicketGrid
            orders={shown}
            renderTicket={(order) => (
              <OrderCard
                order={order}
                now={now}
                currency={venue.data?.currency ?? DEFAULT_CURRENCY}
                next={move.label(order)}
                busy={move.busy(order)}
                onNext={() => move.run(order)}
                onMarkPaid={canCreate ? () => setPaying(order) : undefined}
              />
            )}
          />
        )}
      </DeskWait>
      {paying && venue.data ? (
        <MarkPaidSheet
          order={paying}
          venueId={venueId}
          methods={inPersonMethods(publicVenue.data?.payMethods)}
          currency={venue.data.currency}
          onClose={() => setPaying(null)}
        />
      ) : null}
      {creating && venue.data ? (
        <CreateOrderSheet
          venueId={venueId}
          slug={venue.data.slug}
          currency={venue.data.currency}
          onClose={() => setCreating(false)}
        />
      ) : null}
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
});
