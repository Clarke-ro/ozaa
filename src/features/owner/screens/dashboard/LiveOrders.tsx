import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { DEFAULT_CURRENCY } from '@/lib/money';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { ownerKeys } from '../../data/keys';
import { SectionLabel } from '../../kit';
import { OrderCard } from '../orders/OrderCard';
import { useOrderMove } from '../orders/useOrderMove';

const SHOWN = 4;
// Wait times on the cards move every half minute; the list itself refreshes every 5 seconds.
const TICK_MS = 30_000;
const LIVE_MS = 5000;

/**
 * The oldest open tickets as their own cards, live: wait times tick, and the next step
 * (Start cooking, Mark ready) works right here. The full list lives on Orders.
 */
export function LiveOrders({ venueId }: { venueId: string }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const role = useOwnerSession((s) => s.role) ?? 'waiter';
  const move = useOrderMove(venueId, role);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);
  const orders = useQuery({
    queryKey: ownerKeys.orders(venueId),
    queryFn: () => api.ownerListOrders(venueId),
    enabled: Boolean(venueId),
    refetchInterval: LIVE_MS,
  });
  const venue = useQuery({
    queryKey: ownerKeys.venue(venueId),
    queryFn: () => api.ownerGetVenue(venueId),
    enabled: Boolean(venueId),
  });
  // Oldest first: the guest who has waited longest is the one to look at.
  const open = (orders.data?.items ?? [])
    .filter((order) => order.status !== 'served' && order.status !== 'cancelled')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return (
    <View style={styles.wrap}>
      <SectionLabel
        title={t('owner.liveOrders')}
        caps
        action={t('ownerDash.seeAll')}
        onAction={() => router.push('/owner/orders')}
      />
      {open.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          <Text variant="body" style={{ color: theme.muted }}>
            {orders.isLoading ? ' ' : t('ownerDash.noLiveOrders')}
          </Text>
        </View>
      ) : (
        open.slice(0, SHOWN).map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            now={now}
            currency={venue.data?.currency ?? DEFAULT_CURRENCY}
            next={move.label(order)}
            busy={move.busy(order)}
            onNext={() => move.run(order)}
          />
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.space[2] },
  empty: {
    paddingVertical: tokens.space[4],
    paddingHorizontal: tokens.space[4],
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
  },
});
