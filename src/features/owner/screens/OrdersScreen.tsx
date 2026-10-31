import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useOwnerSession } from '@/features/session';
import { nextOrderMove, type OrderStatus, type StaffRole } from '@/features/orders';
import { DeskWait, OwnerPage } from '../chrome/OwnerPage';
import { DeskCard, DeskTabs, StatusPill } from '../kit';

const MOVE = {
  start: 'owner.start',
  ready: 'owner.markReady',
  serve: 'owner.markServed',
} as const;

type OrderTab = 'all' | 'received' | 'preparing' | 'ready' | 'served';

export function OrdersScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const role = (useOwnerSession((state) => state.role) ?? 'kitchen') as StaffRole;
  const client = useQueryClient();

  const [tab, setTab] = useState<OrderTab>('all');

  const orders = useQuery({
    queryKey: ['owner-orders', venueId],
    queryFn: () => api.ownerListOrders(venueId),
    enabled: Boolean(venueId),
    refetchInterval: 5000,
  });

  const venue = useQuery({
    queryKey: ['owner-venue', venueId],
    queryFn: () => api.ownerGetVenue(venueId),
    enabled: Boolean(venueId),
  });

  const save = useMutation({
    mutationFn: (input: { id: string; status: OrderStatus }) =>
      api.ownerSetOrderStatus(input.id, { status: input.status }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['owner-orders', venueId] }),
  });

  const allItems = orders.data?.items ?? [];
  const currency = venue.data?.currency ?? 'GHS';

  const liveOrders = allItems.filter(
    (order) => order.status !== 'served' && order.status !== 'cancelled'
  );

  const filteredOrders = allItems.filter((order) => {
    if (tab === 'all') return order.status !== 'cancelled';
    return order.status === tab;
  });

  const tabs = [
    { id: 'all' as const, label: 'All live', count: liveOrders.length },
    {
      id: 'received' as const,
      label: 'Received',
      count: allItems.filter((o) => o.status === 'received').length,
    },
    {
      id: 'preparing' as const,
      label: 'Preparing',
      count: allItems.filter((o) => o.status === 'preparing').length,
    },
    {
      id: 'ready' as const,
      label: 'Ready',
      count: allItems.filter((o) => o.status === 'ready').length,
    },
    {
      id: 'served' as const,
      label: 'Served',
      count: allItems.filter((o) => o.status === 'served').length,
    },
  ];

  return (
    <OwnerPage
      title={t('owner.orders')}
      subtitle="Kitchen display system and real-time ticket progression."
    >
      <DeskTabs tabs={tabs} value={tab} onChange={setTab} />

      <DeskWait loading={orders.isLoading} error={orders.isError} onRetry={() => void orders.refetch()}>
        <View style={styles.stack}>
          {filteredOrders.length === 0 ? (
            <Text variant="body" style={{ color: theme.muted, paddingVertical: tokens.space[4] }}>
              {t('owner.noOrders')}
            </Text>
          ) : null}

          {filteredOrders.map((order) => {
            const next = nextOrderMove(order.status, role);
            const isReady = order.status === 'ready';
            const isPreparing = order.status === 'preparing';

            return (
              <DeskCard
                key={order.id}
                tone={isReady ? 'selected' : isPreparing ? 'wash' : 'plain'}
                style={styles.ticketCard}
              >
                {/* Ticket Header */}
                <View style={styles.ticketHeader}>
                  <View style={{ gap: 2 }}>
                    <Text variant="title" style={styles.ticketNumber}>
                      #{order.number}
                    </Text>
                    <Text variant="caption" style={{ color: theme.meta }}>
                      {order.tableCode ? t('home.table', { code: order.tableCode }) : 'Takeaway'}
                    </Text>
                  </View>

                  <StatusPill
                    label={t(`statusLabel.${order.status}`)}
                    tone={
                      order.status === 'ready'
                        ? 'success'
                        : order.status === 'preparing'
                          ? 'accent'
                          : 'waiting'
                    }
                    boxed
                    icon={true}
                  />
                </View>

                {/* Items List */}
                <View style={styles.linesList}>
                  {order.lines.map((line) => (
                    <View key={line.id} style={styles.lineRow}>
                      <View style={styles.qtyBadge}>
                        <Text variant="caption" style={styles.qtyText}>
                          {line.quantity}×
                        </Text>
                      </View>
                      <Text variant="body-strong" style={{ flex: 1 }}>
                        {line.name}
                      </Text>
                      <Text variant="caption" style={{ fontVariant: ['tabular-nums'], color: theme.meta }}>
                        {formatMoney(pesewas(line.totalPesewas), currency)}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Footer with Total and Next Action */}
                <View style={styles.ticketFooter}>
                  <View>
                    <Text variant="caption" style={{ color: theme.meta }}>
                      Total
                    </Text>
                    <Text
                      variant="title"
                      style={[styles.ticketTotal, { fontVariant: ['tabular-nums'] }]}
                    >
                      {formatMoney(pesewas(order.totalPesewas), currency)}
                    </Text>
                  </View>

                  {next ? (
                    <Button
                      label={t(
                        next.move === 'start'
                          ? MOVE.start
                          : next.move === 'ready'
                            ? MOVE.ready
                            : MOVE.serve
                      )}
                      tone={next.move === 'ready' ? 'primary' : 'secondary'}
                      loading={save.isPending}
                      onPress={() => save.mutate({ id: order.id, status: next.status })}
                      style={styles.actionBtn}
                    />
                  ) : null}
                </View>
              </DeskCard>
            );
          })}
        </View>
      </DeskWait>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[4], marginTop: tokens.space[2] },
  ticketCard: {
    padding: tokens.space[4],
    gap: tokens.space[3],
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: tokens.space[2],
    borderBottomWidth: 1,
    borderBottomColor: '#E4E4E7',
  },
  ticketNumber: {
    fontSize: 22,
    lineHeight: 28,
  },
  linesList: {
    gap: tokens.space[2],
    paddingVertical: tokens.space[1],
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
  },
  qtyBadge: {
    backgroundColor: '#F4F4F5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  qtyText: {
    fontFamily: 'Inter_600',
    fontSize: 13,
  },
  ticketFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: tokens.space[3],
    borderTopWidth: 1,
    borderTopColor: '#E4E4E7',
  },
  ticketTotal: {
    fontSize: 18,
  },
  actionBtn: {
    minHeight: 44,
    paddingHorizontal: 20,
  },
});
