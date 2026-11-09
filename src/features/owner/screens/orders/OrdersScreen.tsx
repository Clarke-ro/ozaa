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
import { orderTab, orderTabCounts, type OrderView } from '../../desk/ops';
import { ORDER_RANGES, orderRange, type OrderRange } from '../../desk/orderRange';
import { CardGrid, EmptyCard, PeriodSelect } from '../../kit';
import { CreateOrderSheet } from './CreateOrderSheet';
import { MarkPaidSheet } from './MarkPaidSheet';
import { OrderCard } from './OrderCard';
import { OrdersToolbar } from './OrdersToolbar';
import { useOrderMove } from './useOrderMove';
import { useVenuePay } from './useVenuePay';

const LIVE: OrderView[] = ['new', 'cooking', 'ready'];
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
  const { venue, methods } = useVenuePay(venueId);
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
  const currency = venue.data?.currency ?? DEFAULT_CURRENCY;

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
          <CardGrid columns={desktop ? 3 : wide ? 2 : 1}>
            {shown.map((order) => (
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
            ))}
          </CardGrid>
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
