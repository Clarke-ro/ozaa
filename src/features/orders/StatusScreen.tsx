import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ClipboardList } from 'lucide-react-native';
import { api } from '@/lib/api';
import { useGuestSession } from '@/features/session';
import { useVenue } from '@/features/venue';
import { DEFAULT_CURRENCY } from '@/lib/money';
import { canPayOnline } from '@/lib/payments';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { PageHeader } from '@/ui/PageHeader';
import { PriceText } from '@/ui/PriceText';
import { SafeScreen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { ErrorState, LoadingState } from '@/ui/states';
import { useTheme } from '@/ui/theme';
import { StatusTimeline } from './StatusTimeline';
import { guestKeys } from '@/lib/queryKeys';
import { POLL_MS } from '@/lib/polling';

/** Where the order is: now, the steps, what was ordered, and what to do next. */
export function StatusScreen({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const venue = useVenue(slug);
  const currency = venue.data?.currency ?? DEFAULT_CURRENCY;
  const orderId = useGuestSession((state) => (state.slug === slug ? state.orderId : null));
  const hydrated = useGuestSession((state) => state.hydrated);
  const order = useQuery({
    queryKey: guestKeys.order(orderId),
    queryFn: () => api.getOrder(orderId ?? ''),
    enabled: Boolean(orderId),
    refetchInterval: POLL_MS.guest,
  });

  // On phones the saved visit takes a moment to load; don't flash "no order" meanwhile.
  if (!hydrated) return <LoadingState />;
  if (!orderId) {
    return (
      <SafeScreen>
        <PageHeader title={t('status.noOrderTitle')} />
        <View style={styles.empty}>
          <ClipboardList size={32} color={theme.meta} />
          <Text variant="title">{t('status.noOrder')}</Text>
          <Text variant="body" style={[styles.center, { color: theme.muted }]}>
            {t('status.noOrderBody')}
          </Text>
          <Button label={t('status.seeMenu')} onPress={() => router.push(`/${slug}/menu`)} />
        </View>
      </SafeScreen>
    );
  }
  if (order.isLoading) return <LoadingState />;
  if (order.isError || !order.data) return <ErrorState onRetry={() => void order.refetch()} />;
  const o = order.data;
  const unpaid = o.paymentStatus === 'unpaid' || o.paymentStatus === 'part_paid';
  const fromLink = o.source === 'pickup' || o.source === 'delivery';
  const payOnline = canPayOnline(venue.data);
  // Staff can mark an order paid at any venue, so a paid order says so even without online pay.
  const showPaid = payOnline || o.paymentStatus !== 'unpaid';
  const card = [styles.card, { backgroundColor: theme.surface }];

  return (
    <SafeScreen>
      <PageHeader
        title={t('status.title', { number: o.number })}
        subtitle={
          o.tableCode
            ? t('home.table', { code: o.tableCode })
            : o.source === 'delivery'
              ? t('linkOrder.status.delivery')
              : o.source === 'pickup'
                ? t('linkOrder.status.pickup')
                : undefined
        }
      />
      <ScrollView contentContainerStyle={styles.page}>
        <View style={card}>
          <Text variant="caption" style={{ color: theme.meta }}>
            {t('status.now')}
          </Text>
          <Text variant="display-m">{t(`statusLabel.${o.status}`)}</Text>
          {/* Only the kitchen's own estimate; no estimate means no time shown. */}
          {o.etaMinutes != null && (o.status === 'received' || o.status === 'preparing') ? (
            <Text variant="body" style={{ color: theme.muted }}>
              {t('status.eta', { minutes: o.etaMinutes })}
            </Text>
          ) : null}
          {o.source === 'pickup' && o.status === 'ready' ? (
            <Text variant="body-strong">{t('linkOrder.status.collect')}</Text>
          ) : null}
          {o.source === 'delivery' && o.deliveryAddress ? (
            <Text variant="body" style={{ color: theme.muted }}>
              {t('linkOrder.status.to', { address: o.deliveryAddress })}
            </Text>
          ) : null}
          <View style={styles.timeline}>
            <StatusTimeline order={o} />
          </View>
        </View>

        <View style={card}>
          <Text variant="body-strong">{t('status.yourOrder')}</Text>
          {o.lines.map((line) => (
            <View key={line.id} style={styles.row}>
              <Text variant="body" style={styles.flex}>
                {line.quantity} × {line.name}
              </Text>
              <PriceText amount={line.totalPesewas} currency={currency} />
            </View>
          ))}
          {o.deliveryFeePesewas ? (
            <View style={styles.row}>
              <Text variant="body" style={styles.flex}>
                {t('linkOrder.deliveryFee')}
              </Text>
              <PriceText amount={o.deliveryFeePesewas} currency={currency} />
            </View>
          ) : null}
          <View style={[styles.row, styles.total, { borderColor: theme.line }]}>
            <Text variant="body-strong" style={styles.flex}>
              {t('status.total')}
            </Text>
            <PriceText amount={o.totalPesewas} currency={currency} size="title" />
          </View>
          {showPaid ? (
            <Text variant="caption" style={{ color: unpaid ? theme.muted : theme.success }}>
              {t(`status.paid.${o.paymentStatus}`)}
            </Text>
          ) : (
            <Text variant="caption" style={{ color: theme.muted }}>
              {o.source === 'delivery'
                ? t('linkOrder.status.payDelivery')
                : o.source === 'pickup'
                  ? t('linkOrder.status.payPickup')
                  : t('status.payAtCounter')}
            </Text>
          )}
        </View>

        <View style={styles.actions}>
          {/* In-app Pay is for a table's bill; pickup and delivery pay on collection. */}
          {payOnline && unpaid && !fromLink ? (
            <Button label={t('status.pay')} onPress={() => router.push(`/${slug}/pay`)} />
          ) : null}
          <View style={styles.pair}>
            {/* Only a guest at a table can call a waiter. */}
            {fromLink ? null : (
              <Button
                label={t('status.call')}
                tone="secondary"
                size="md"
                style={styles.flex}
                onPress={() => router.push(`/${slug}/waiter`)}
              />
            )}
            <Button
              label={t('status.orderMore')}
              tone="secondary"
              size="md"
              style={styles.flex}
              onPress={() => router.push(`/${slug}/menu`)}
            />
          </View>
        </View>
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: tokens.grid.mobile.margin,
    gap: tokens.space[4],
    paddingBottom: tokens.space[16],
  },
  card: {
    gap: tokens.space[2],
    padding: tokens.space[4],
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
    boxShadow: tokens.shadow.card,
  },
  timeline: { marginTop: tokens.space[3] },
  row: { flexDirection: 'row', alignItems: 'baseline', gap: tokens.space[3] },
  total: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: tokens.space[2],
    marginTop: tokens.space[1],
  },
  flex: { flex: 1 },
  actions: { gap: tokens.space[2] },
  pair: { flexDirection: 'row', gap: tokens.space[2] },
  empty: {
    alignItems: 'center',
    gap: tokens.space[3],
    padding: tokens.space[6],
    paddingTop: tokens.space[16],
  },
  center: { textAlign: 'center' },
});
