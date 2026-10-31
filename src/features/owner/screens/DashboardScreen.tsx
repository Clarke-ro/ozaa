import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useOwnerSession } from '@/features/session';
import { DeskWait, OwnerPage } from '../chrome/OwnerPage';

export function DashboardScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const desk = useQuery({
    queryKey: ['owner-dashboard', venueId],
    queryFn: () => api.ownerGetDashboard(venueId),
    enabled: Boolean(venueId),
    refetchInterval: 5000,
  });
  const data = desk.data;
  const amount = data ? formatMoney(pesewas(data.salesTodayPesewas), data.currency) : '';
  const headline =
    data?.direction === 'up'
      ? t('owner.madeUp', { amount, percent: data.changePercent })
      : data?.direction === 'down'
        ? t('owner.madeDown', { amount, percent: Math.abs(data.changePercent ?? 0) })
        : t('owner.made', { amount });

  return (
    <OwnerPage title={t('owner.dashboard')}>
      <DeskWait loading={desk.isLoading} error={desk.isError} onRetry={() => void desk.refetch()}>
        {data ? (
          <View style={styles.stack}>
            <Text variant="title">{headline}</Text>
            <View style={styles.counts}>
              <Count label={t('owner.openTables')} value={String(data.openTables)} />
              <Count label={t('owner.liveOrders')} value={String(data.liveOrders)} />
              <Count label={t('owner.waiterCalls')} value={String(data.openCalls)} />
              <Count
                label={t('owner.rating')}
                value={data.ratingAverage === null ? t('owner.noRating') : data.ratingAverage.toFixed(1)}
              />
            </View>
            <View style={styles.stack}>
              {data.alerts.length === 0 ? <Text variant="body">{t('owner.noAlerts')}</Text> : null}
              {data.alerts.map((alert) => (
                <Text key={alert.code} variant="body">
                  {alert.code === 'calls' ? t('owner.alertCalls', { count: alert.count ?? 0 }) : null}
                  {alert.code === 'bills' ? t('owner.alertBills', { count: alert.count ?? 0 }) : null}
                  {alert.code === 'payout' ? t('owner.alertPayout') : null}
                  {alert.code === 'sold_out' ? t('owner.alertSold', { detail: alert.detail ?? '' }) : null}
                </Text>
              ))}
            </View>
            <View style={[styles.rule, { backgroundColor: theme.line }]} />
          </View>
        ) : null}
      </DeskWait>
    </OwnerPage>
  );
}

function Count({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={styles.count}>
      <Text variant="caption" style={{ color: theme.meta }}>
        {label}
      </Text>
      <Text variant="title" style={{ fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[3] },
  counts: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[4] },
  count: { width: 140, gap: tokens.space[1] },
  rule: { height: 1, marginTop: tokens.space[2] },
});
