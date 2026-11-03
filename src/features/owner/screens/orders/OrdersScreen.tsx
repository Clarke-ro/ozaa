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
import { OpenCalls } from './OpenCalls';
import { OrderCard } from './OrderCard';
import { useOrderMove } from './useOrderMove';

const LIVE: OrderView[] = ['new', 'cooking', 'ready'];
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
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);
  const key = ownerKeys.orders(venueId);
  const orders = useQuery({
    queryKey: key,
    queryFn: () => api.ownerListOrders(venueId),
    enabled: Boolean(venueId),
    refetchInterval: 5000,
  });
  const venue = useQuery({
    queryKey: ownerKeys.venue(venueId),
    queryFn: () => api.ownerGetVenue(venueId),
    enabled: Boolean(venueId),
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
    <OwnerPage title={t('owner.orders')}>
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
                />
              </View>
            ))}
          </View>
        )}
      </DeskWait>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  list: { gap: tokens.space[3] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start' },
  half: { flexBasis: '48%', flexGrow: 1 },
});
