import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ClipboardList } from 'lucide-react-native';
import { api } from '@/lib/api';
import { nextOrderMove, type OrderStatus } from '@/features/orders';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { ownerKeys } from '../../data/keys';
import { orderTab, type OrderTab } from '../../desk/ops';
import { DeskTabs, EmptyCard, toast } from '../../kit';
import { OrderCard } from './OrderCard';

const TABS: OrderTab[] = ['new', 'cooking', 'ready', 'done'];

/** Kitchen tickets by stage. Each ticket shows only the next step this person is allowed to take. */
export function OrdersScreen() {
  const { t } = useTranslation();
  const client = useQueryClient();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const role = useOwnerSession((state) => state.role) ?? 'waiter';
  const [tab, setTab] = useState<OrderTab>('new');
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

  const move = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      api.ownerSetOrderStatus(id, { status }),
    onSuccess: (_o, { status }) => {
      toast.success(t(`statusLabel.${status}`));
      void client.invalidateQueries({ queryKey: key });
      void client.invalidateQueries({ queryKey: ownerKeys.floor(venueId) });
      void client.invalidateQueries({ queryKey: ownerKeys.dashboard(venueId) });
    },
    onError: () => toast.error(t('ownerKit.saveFailed')),
  });

  const all = orders.data?.items ?? [];
  const count = (id: OrderTab) => all.filter((o) => orderTab(o.status) === id).length;
  // Oldest first in the live tabs (who has waited longest), newest first once done.
  const shown = all
    .filter((o) => orderTab(o.status) === tab)
    .sort((a, b) =>
      tab === 'done'
        ? b.createdAt.localeCompare(a.createdAt)
        : a.createdAt.localeCompare(b.createdAt),
    );

  return (
    <OwnerPage title={t('owner.orders')}>
      <DeskTabs
        value={tab}
        onChange={setTab}
        tabs={TABS.map((id) => ({
          id,
          label: t(`ownerOrders.tabs.${id}`),
          count: id === 'done' ? undefined : count(id),
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
          <View style={styles.list}>
            {shown.map((order) => {
              const next = nextOrderMove(order.status, role);
              return (
                <OrderCard
                  key={order.id}
                  order={order}
                  currency={venue.data?.currency ?? 'GHS'}
                  next={next ? t(`ownerOrders.move.${next.move}`) : null}
                  busy={move.isPending && move.variables?.id === order.id}
                  onNext={() => next && move.mutate({ id: order.id, status: next.status })}
                />
              );
            })}
          </View>
        )}
      </DeskWait>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({ list: { gap: tokens.space[3] } });
