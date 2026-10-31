import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import type { InsightsReport } from '@/lib/api/types';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useOwnerSession } from '@/features/session';
import { DeskWait, OwnerPage } from '../chrome/OwnerPage';

const RANGES: InsightsReport['range'][] = ['today', '7d', '30d'];

export function InsightsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const [range, setRange] = useState<InsightsReport['range']>('7d');
  const report = useQuery({
    queryKey: ['owner-insights', venueId, range],
    queryFn: () => api.ownerGetInsights(venueId, range),
    enabled: Boolean(venueId),
  });
  const data = report.data;
  const max = Math.max(1, ...(data?.series.map((point) => point.pesewas) ?? [1]));
  const labels = { today: t('owner.rangeToday'), '7d': t('owner.rangeWeek'), '30d': t('owner.rangeMonth') };

  return (
    <OwnerPage title={t('owner.insights')}>
      <View style={styles.ranges}>
        {RANGES.map((value) => (
          <Pressable key={value} accessibilityRole="button" onPress={() => setRange(value)} style={[styles.range, { borderColor: range === value ? theme.black : theme.line }]}>
            <Text variant="caption">{labels[value]}</Text>
          </Pressable>
        ))}
      </View>
      <DeskWait loading={report.isLoading} error={report.isError} onRetry={() => void report.refetch()}>
        {data ? (
          <View style={styles.stack}>
            {data.sample ? <Text variant="caption" style={{ color: theme.meta }}>{t('owner.sampleMark')}</Text> : null}
            <Text variant="title" style={{ fontVariant: ['tabular-nums'] }}>{formatMoney(pesewas(data.salesPesewas), data.currency)}</Text>
            <View style={styles.bars}>
              {data.series.map((point) => (
                <View key={point.label} style={styles.barCol}>
                  <View style={[styles.bar, { height: Math.max(8, (point.pesewas / max) * 96), backgroundColor: theme.black }]} />
                  <Text variant="caption">{point.label}</Text>
                </View>
              ))}
            </View>
            <Text variant="body-strong">{t('owner.topItems')}</Text>
            {data.topItems.map((item) => (
              <Text key={item.name}>
                {item.name} · {item.count} · {formatMoney(pesewas(item.pesewas), data.currency)}
              </Text>
            ))}
            <Text variant="body-strong">{t('owner.peak')}</Text>
            {data.peakHours.map((hour) => (
              <Text key={hour.hour}>
                {hour.hour}:00 · {hour.orders}
              </Text>
            ))}
            <Text>{t('owner.repeat', { count: data.repeatGuests.count, percent: data.repeatGuests.sharePercent })}</Text>
          </View>
        ) : null}
      </DeskWait>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  ranges: { flexDirection: 'row', gap: tokens.space[2] },
  range: { minHeight: 44, paddingHorizontal: tokens.space[3], borderWidth: 1, borderRadius: tokens.radius.full, justifyContent: 'center' },
  stack: { gap: tokens.space[3] },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: tokens.space[3], height: 120 },
  barCol: { alignItems: 'center', gap: tokens.space[1], flex: 1 },
  bar: { width: 18, borderRadius: tokens.radius.sm },
});
