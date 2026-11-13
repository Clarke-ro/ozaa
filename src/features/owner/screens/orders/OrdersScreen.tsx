import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ClipboardList } from 'lucide-react-native';
import { api } from '@/lib/api';
import { useOwnerSession } from '@/features/session';
import type { Order } from '@/lib/api/types';
import { DEFAULT_CURRENCY } from '@/lib/money';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { useOwnerLayout } from '../../chrome/layout';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { ownerKeys } from '../../data/keys';
import { filterCounts, inFilter, type OrderFilter } from '../../desk/orderBoard';
import { ORDER_RANGES, orderRange, type OrderRange } from '../../desk/orderRange';
import { CardGrid, EmptyCard, PeriodSelect } from '../../kit';
import { CreateOrderSheet } from './CreateOrderSheet';
import { MarkPaidSheet } from './MarkPaidSheet';
import { OrderCard } from './OrderCard';
import { OrderBoard } from './OrderBoard';
import { OrdersToolbar, type OrderLayout } from './OrdersToolbar';
import { useOrderMove } from './useOrderMove';
import { useVenuePay } from './useVenuePay';
import { POLL_MS } from '@/lib/polling';

// Only a safety net while the venue loads; every venue has a zone in its opening hours.
const FALLBACK_ZONE = 'Africa/Accra';
// Ticket ages only need to move once every half minute.
const TICK_MS = 30_000;

/**
 * Kitchen tickets by stage, each on its own card in a grid (three across on a desktop, two on a
 * tablet, one on a phone). A card shows the dishes and only the next step this person is allowed
 * to take; tapping it opens the full order. Waiter calls live on Calls and the Floor, not here.
 */
export function OrdersScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { wide, desktop } = useOwnerLayout();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const role = useOwnerSession((state) => state.role) ?? 'waiter';
  const [filter, setFilter] = useState<OrderFilter>('open');
  const [layout, setLayout] = useState<OrderLayout>('board');
  const [range, setRange] = useState<OrderRange>('today');
  const [creating, setCreating] = useState(false);
  const [paying, setPaying] = useState<Order | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);
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

  const all = orders.data?.items ?? [];
  const counts = filterCounts(all);
  const live = filter === 'open';
  const board = live && layout === 'board';
  // Oldest first while still in the kitchen (who has waited longest), newest first once done.
  const shown = all
    .filter((o) => inFilter(o.status, filter))
    .sort((a, b) =>
      !live ? b.createdAt.localeCompare(a.createdAt) : a.createdAt.localeCompare(b.createdAt),
    );
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
    />
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
      <OrdersToolbar
        filter={filter}
        counts={counts}
        onFilter={setFilter}
        layout={layout}
        onLayout={setLayout}
      />
      <DeskWait
        loading={orders.isLoading}
        error={orders.isError}
        onRetry={() => void orders.refetch()}
      >
        {shown.length === 0 ? (
          <EmptyCard
            icon={ClipboardList}
            title={t(`ownerOrders.empty.${filter}`)}
            description={t('ownerOrders.emptyBody')}
          />
        ) : board ? (
          <OrderBoard orders={shown} side={wide} renderCard={card} />
        ) : (
          <CardGrid columns={desktop ? 3 : wide ? 2 : 1}>{shown.map(card)}</CardGrid>
        )}
      </DeskWait>
      {paying && venue.data ? (
        <MarkPaidSheet
          order={paying}
          venueId={venueId}
          methods={methods}
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
