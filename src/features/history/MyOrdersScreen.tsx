import { useEffect } from 'react';
import { statusKey } from '@/lib/orderTimeline';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ChevronRight, ClipboardList } from 'lucide-react-native';
import { api } from '@/lib/api';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { POLL_MS } from '@/lib/polling';
import { guestKeys } from '@/lib/queryKeys';
import { useGuestSession } from '@/features/session';
import { useVenue } from '@/features/venue';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { PageHeader } from '@/ui/PageHeader';
import { SafeScreen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import type { PastOrder } from './orderHistory';
import { useOrderHistory } from './useOrderHistory';

const FINISHED = new Set(['served', 'cancelled']);

/**
 * My orders, for customers ordering from a venue's link: the order on its way, followed live,
 * then earlier orders placed on this phone. No account needed.
 */
export function MyOrdersScreen({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const venue = useVenue(slug);
  const currentId = useGuestSession((s) => (s.slug === slug ? s.orderId : null));
  const all = useOrderHistory((s) => s.orders);
  const setStatus = useOrderHistory((s) => s.setStatus);
  const live = useQuery({
    queryKey: guestKeys.order(currentId),
    queryFn: () => api.getOrder(currentId ?? ''),
    enabled: Boolean(currentId),
    refetchInterval: POLL_MS.guest,
  });
  // Save what we see, so the order still shows its last status once it's in the past.
  useEffect(() => {
    if (live.data) setStatus(live.data.id, live.data.status);
  }, [live.data, setStatus]);

  const mine = all.filter((order) => order.slug === slug);
  const current = mine.find((order) => order.orderId === currentId);
  const active = current && !FINISHED.has(live.data?.status ?? current.status) ? current : null;
  const earlier = mine.filter((order) => order !== active);

  return (
    <SafeScreen>
      <PageHeader title={t('myOrders.title')} subtitle={venue.data?.name ?? ''} />
      <ScrollView contentContainerStyle={styles.page}>
        {mine.length === 0 ? (
          <View style={styles.empty}>
            <ClipboardList size={32} color={theme.meta} />
            <Text variant="title">{t('myOrders.none')}</Text>
            <Text variant="body" style={[styles.center, { color: theme.muted }]}>
              {t('myOrders.noneBody')}
            </Text>
            <Button label={t('status.seeMenu')} onPress={() => router.replace(`/${slug}`)} />
          </View>
        ) : null}
        {active ? (
          <View style={styles.group}>
            <Text variant="title" accessibilityRole="header">
              {t('myOrders.now')}
            </Text>
            <OrderCard
              order={{ ...active, status: live.data?.status ?? active.status }}
              live
              onPress={() => router.push(`/${slug}/status`)}
            />
          </View>
        ) : null}
        {earlier.length > 0 ? (
          <View style={styles.group}>
            <Text variant="title" accessibilityRole="header">
              {t('myOrders.earlier')}
            </Text>
            {earlier.map((order) => (
              <OrderCard
                key={order.orderId}
                order={order}
                onPress={
                  order.orderId === currentId ? () => router.push(`/${slug}/status`) : undefined
                }
              />
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeScreen>
  );
}

function OrderCard({
  order,
  live = false,
  onPress,
}: {
  order: PastOrder;
  live?: boolean;
  onPress?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const items = order.items.map((item) => `${item.quantity} × ${item.name}`).join(', ');
  const when = new Date(order.placedAt).toLocaleString(i18n.language, {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
  const body = (
    <>
      <View style={styles.copy}>
        <View style={styles.row}>
          <Text variant="body" style={styles.strong}>
            {t('status.title', { number: order.number })}
          </Text>
          <Text variant="body" style={[styles.strong, styles.num]}>
            {formatMoney(pesewas(order.totalPesewas), order.currency)}
          </Text>
        </View>
        <Text variant="caption" numberOfLines={2} style={{ color: theme.muted }}>
          {items}
        </Text>
        <View style={styles.row}>
          <Text
            variant="caption"
            style={[styles.strong, { color: live ? theme.ink : theme.muted }]}
          >
            {t(statusKey(order))}
          </Text>
          <Text variant="caption" style={{ color: theme.meta }}>
            {when}
          </Text>
        </View>
      </View>
      {onPress ? <ChevronRight size={18} color={theme.meta} /> : null}
    </>
  );
  const card = [
    styles.card,
    { backgroundColor: theme.surface, borderColor: live ? theme.ink : theme.line },
  ];
  return onPress ? (
    <Pressable accessibilityRole="button" onPress={onPress} style={card}>
      {body}
    </Pressable>
  ) : (
    <View style={card}>{body}</View>
  );
}

const styles = StyleSheet.create({
  page: { padding: tokens.grid.mobile.margin, gap: tokens.space[5], paddingBottom: 96 },
  group: { gap: tokens.space[3] },
  empty: { alignItems: 'center', gap: tokens.space[3], paddingTop: tokens.space[8] },
  center: { textAlign: 'center' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    padding: tokens.space[4],
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
  },
  copy: { flex: 1, gap: tokens.space[1] },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: tokens.space[2] },
  strong: { fontFamily: fontFamily.strong },
  num: { fontVariant: ['tabular-nums'] },
});
