import { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ClipboardList } from 'lucide-react-native';
import { api } from '@/lib/api';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { ownerKeys } from '../../data/keys';
import { ORDER_VIEWS, orderTab, orderTabCounts, type OrderView } from '../../desk/ops';
import { FilterChips } from '@/ui/FilterChips';
import { DEFAULT_CURRENCY } from '@/lib/money';
import { EmptyCard } from '../../kit';
import { Button } from '@/ui/Button';
import { ORDER_RANGES, orderRange, type OrderRange } from '../../desk/orderRange';
import { CreateOrderSheet } from './CreateOrderSheet';
import { MarkPaidSheet, inPersonMethods } from './MarkPaidSheet';
import type { Order } from '@/lib/api/types';
import { guestKeys } from '@/lib/queryKeys';
import { OpenCalls } from './OpenCalls';
import { OrderCard } from './OrderCard';
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
  const { width } = useWindowDimensions();
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
  const twoUp = width >= 900;
  // Oldest first in the live tabs (who has waited longest), newest first once done.
  const shown = all
    .filter((o) => tab === 'all' || orderTab(o.status) === tab)
    .sort((a, b) =>
      !live ? b.createdAt.localeCompare(a.createdAt) : a.createdAt.localeCompare(b.createdAt),
    );

  return (
    <OwnerPage
      title={t('owner.orders')}
      action={
        canCreate && venue.data ? (
          <Button
            label={t('ownerOrders.create.open')}
            size="md"
            onPress={() => setCreating(true)}
          />
        ) : null
      }
    >
      <OpenCalls now={now} />
      <FilterChips<OrderView>
        label={t('owner.orders')}
        value={tab}
        onChange={setPicked}
        items={ORDER_VIEWS.map((id) => ({
          id,
          label: t(`ownerOrders.tabs.${id}`),
          count: counts[id],
        }))}
      />
      <FilterChips<OrderRange>
        label={t('ownerOrders.range.label')}
        value={range}
        onChange={setRange}
        items={ORDER_RANGES.map((id) => ({ id, label: t(`ownerOrders.range.${id}`) }))}
      />
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
          <View style={[styles.list, twoUp && styles.grid]}>
            {shown.map((order) => (
              <View key={order.id} style={twoUp ? styles.half : null}>
                <OrderCard
                  order={order}
                  now={now}
                  currency={venue.data?.currency ?? DEFAULT_CURRENCY}
                  next={move.label(order)}
                  busy={move.busy(order)}
                  onNext={() => move.run(order)}
                  onMarkPaid={canCreate ? () => setPaying(order) : undefined}
                />
              </View>
            ))}
          </View>
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
  list: { gap: tokens.space[3] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start' },
  half: { flexBasis: '48%', flexGrow: 1 },
});
