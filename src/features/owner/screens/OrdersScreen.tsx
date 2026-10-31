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

const MOVE = { start: 'owner.start', ready: 'owner.markReady', serve: 'owner.markServed' } as const;

export function OrdersScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const role = (useOwnerSession((state) => state.role) ?? 'kitchen') as StaffRole;
  const client = useQueryClient();
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
    mutationFn: (input: { id: string; status: OrderStatus }) => api.ownerSetOrderStatus(input.id, { status: input.status }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['owner-orders', venueId] }),
  });
  const open = (orders.data?.items ?? []).filter((order) => order.status !== 'served' && order.status !== 'cancelled');
  const currency = venue.data?.currency ?? 'GHS';

  return (
    <OwnerPage title={t('owner.orders')}>
      <DeskWait loading={orders.isLoading} error={orders.isError} onRetry={() => void orders.refetch()}>
        {open.length === 0 ? <Text>{t('owner.noOrders')}</Text> : null}
        {open.map((order) => {
          const next = nextOrderMove(order.status, role);
          return (
            <View key={order.id} style={[styles.ticket, { borderColor: theme.line }]}>
              <Text variant="title">#{order.number}</Text>
              <Text variant="caption" style={{ color: theme.meta }}>
                {order.tableCode ? t('home.table', { code: order.tableCode }) : ''} · {t(`statusLabel.${order.status}`)}
              </Text>
              {order.lines.map((line) => (
                <Text key={line.id}>
                  {line.quantity} × {line.name}
                </Text>
              ))}
              <Text variant="body-strong" style={{ fontVariant: ['tabular-nums'] }}>
                {formatMoney(pesewas(order.totalPesewas), currency)}
              </Text>
              {next ? (
                <Button
                  label={t(next.move === 'start' ? MOVE.start : next.move === 'ready' ? MOVE.ready : MOVE.serve)}
                  tone="secondary"
                  loading={save.isPending}
                  onPress={() => save.mutate({ id: order.id, status: next.status })}
                />
              ) : null}
            </View>
          );
        })}
      </DeskWait>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  ticket: { borderWidth: 1, borderRadius: tokens.radius.md, padding: tokens.space[4], gap: tokens.space[2] },
});
