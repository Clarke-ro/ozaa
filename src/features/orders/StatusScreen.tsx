import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ClipboardList } from 'lucide-react-native';
import { api } from '@/lib/api';
import { useGuestSession } from '@/features/session';
import { useVenue } from '@/features/venue';
import { DEFAULT_CURRENCY } from '@/lib/money';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { PageHeader } from '@/ui/PageHeader';
import { PriceText } from '@/ui/PriceText';
import { SafeScreen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { ErrorState, LoadingState } from '@/ui/states';
import { useTheme } from '@/ui/theme';
import { StatusTimeline } from './StatusTimeline';

// Same pace as the bell, so both agree.
const LIVE_MS = 10_000;

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
    queryKey: ['order', orderId],
    queryFn: () => api.getOrder(orderId ?? ''),
    enabled: Boolean(orderId),
    refetchInterval: LIVE_MS,
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
  const card = [styles.card, { backgroundColor: theme.surface }];

  return (
    <SafeScreen>
      <PageHeader
        title={t('status.title', { number: o.number })}
        subtitle={o.tableCode ? t('home.table', { code: o.tableCode }) : undefined}
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
          <View style={[styles.row, styles.total, { borderColor: theme.line }]}>
            <Text variant="body-strong" style={styles.flex}>
              {t('status.total')}
            </Text>
            <PriceText amount={o.totalPesewas} currency={currency} size="title" />
          </View>
          <Text variant="caption" style={{ color: unpaid ? theme.muted : theme.success }}>
            {t(`status.paid.${o.paymentStatus}`)}
          </Text>
        </View>

        <View style={styles.actions}>
          {unpaid ? (
            <Button label={t('status.pay')} onPress={() => router.push(`/${slug}/pay`)} />
          ) : null}
          <View style={styles.pair}>
            <Button
              label={t('status.call')}
              tone="secondary"
              size="md"
              style={styles.flex}
              onPress={() => router.push(`/${slug}/waiter`)}
            />
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
