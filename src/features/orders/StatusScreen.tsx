import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { useGuestSession } from '@/features/session';
import { Button } from '@/ui/Button';
import { PageHeader } from '@/ui/PageHeader';
import { SafeScreen } from '@/ui/Screen';
import { PriceText } from '@/ui/PriceText';
import { Text } from '@/ui/Text';
import { EmptyState, ErrorState, LoadingState } from '@/ui/states';
import { useTheme } from '@/ui/theme';

const STEPS = ['received', 'preparing', 'ready', 'served'] as const;

export function StatusScreen({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const orderId = useGuestSession((state) => (state.slug === slug ? state.orderId : null));
  const order = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => api.getOrder(orderId ?? ''),
    enabled: Boolean(orderId),
    refetchInterval: 10_000,
  });

  if (!orderId) return <EmptyState message={t('menu.empty')} />;
  if (order.isLoading) return <LoadingState />;
  if (order.isError || !order.data) return <ErrorState onRetry={() => void order.refetch()} />;
  const current = STEPS.indexOf(order.data.status as (typeof STEPS)[number]);

  return (
    <SafeScreen>
      <PageHeader title={t('status.title', { number: order.data.number })} subtitle={t('home.table', { code: order.data.tableCode ?? '' })} />
      <View style={{ padding: 20, gap: 8 }}>
        <Text variant="caption" style={{ color: theme.meta }}>
          {t('status.now')}
        </Text>
        <Text variant="display-m">{t(`statusLabel.${order.data.status}`)}</Text>
        <Text variant="body" style={{ color: theme.muted }}>
          {t('status.eta', { minutes: order.data.etaMinutes ?? 12 })}
        </Text>
        <View style={{ marginTop: 16, gap: 14 }}>
          {STEPS.map((step, index) => (
            <View key={step} style={styles.step}>
              <View style={[styles.dot, { borderColor: index <= current ? theme.fill : theme.line, backgroundColor: index < current ? theme.fill : theme.white }]} />
              <View>
                <Text variant="body-strong">{t(`status.${step}`)}</Text>
              </View>
            </View>
          ))}
        </View>
        <View style={[styles.box, { borderColor: theme.line }]}>
          <Text variant="body-strong">{t('status.yourOrder')}</Text>
          {order.data.lines.map((line) => (
            <View key={line.id} style={styles.row}>
              <Text>
                {line.quantity} × {line.name}
              </Text>
              <PriceText amount={line.totalPesewas} />
            </View>
          ))}
          <View style={styles.row}>
            <Text variant="body-strong">{t('status.total')}</Text>
            <PriceText amount={order.data.totalPesewas} />
          </View>
        </View>
        <Button label={t('status.pay')} onPress={() => router.push(`/${slug}/pay`)} />
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  step: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  dot: { width: 28, height: 28, borderRadius: 14, borderWidth: 2 },
  box: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 8, marginTop: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
});
