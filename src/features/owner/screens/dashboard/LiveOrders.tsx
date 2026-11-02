import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import type { Order } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { ownerKeys } from '../../data/keys';
import { CodeTile, SectionLabel, StatusPill, type PillTone } from '../../kit';

const TONE: Record<Order['status'], PillTone> = {
  received: 'waiting',
  preparing: 'accent',
  ready: 'success',
  served: 'neutral',
  cancelled: 'error',
};

const SHOWN = 4;

/** The newest open tickets. The full list with actions lives on the Orders tab. */
export function LiveOrders({ venueId }: { venueId: string }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const orders = useQuery({
    queryKey: ownerKeys.orders(venueId),
    queryFn: () => api.ownerListOrders(venueId),
    enabled: Boolean(venueId),
    refetchInterval: 5000,
  });
  const open = (orders.data?.items ?? [])
    .filter((order) => order.status !== 'served' && order.status !== 'cancelled')
    .slice(0, SHOWN);

  return (
    <View style={styles.wrap}>
      <SectionLabel
        title={t('owner.liveOrders')}
        action={t('ownerDash.seeAll')}
        onAction={() => router.push('/owner/orders')}
      />
      <View style={[styles.card, { borderColor: theme.line, backgroundColor: theme.surface }]}>
        {open.length === 0 ? (
          <Text variant="body" style={[styles.empty, { color: theme.muted }]}>
            {orders.isLoading ? ' ' : t('ownerDash.noLiveOrders')}
          </Text>
        ) : (
          open.map((order, index) => {
            const count = order.lines.reduce((sum, line) => sum + line.quantity, 0);
            return (
              <View
                key={order.id}
                accessible
                style={[
                  styles.row,
                  index > 0 && {
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: theme.line,
                  },
                ]}
              >
                <CodeTile code={order.tableCode ? `T${order.tableCode}` : 'TA'} size={44} />
                <View style={styles.copy}>
                  <Text variant="body-strong">
                    #{order.number} · {t('ownerDash.items', { count })}
                  </Text>
                  <Text variant="caption" style={{ color: theme.muted }} numberOfLines={2}>
                    {order.lines.map((line) => `${line.quantity}× ${line.name}`).join(', ')}
                  </Text>
                </View>
                <StatusPill
                  label={t(`statusLabel.${order.status}`)}
                  tone={TONE[order.status]}
                  boxed
                />
              </View>
            );
          })
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.space[2] },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
    paddingHorizontal: tokens.space[4],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    paddingVertical: tokens.space[3],
  },
  copy: { flex: 1, gap: 2 },
  empty: { paddingVertical: tokens.space[4] },
});
