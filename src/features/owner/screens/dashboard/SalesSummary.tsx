import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import type { OwnerDashboard } from '@/lib/api/types';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useOwnerSession } from '@/features/session';
import { ownerKeys } from '../../data/keys';
import { salesLine } from '../../desk/dashboardModel';
import { BarChart, Segmented } from '../../kit';

type Range = 'today' | '7d' | '30d';
const RANGES: Range[] = ['today', '7d', '30d'];

/**
 * The period switch, one big sales number and its bars. Sales only mean something when the app
 * takes payments, so the Today panel shows this only when PAYMENTS_ENABLED is true.
 */
export function SalesSummary({ dashboard }: { dashboard: OwnerDashboard }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const [range, setRange] = useState<Range>('today');
  const report = useQuery({
    queryKey: ownerKeys.insights(venueId, range),
    queryFn: () => api.ownerGetInsights(venueId, range),
    enabled: Boolean(venueId),
  });
  const money = (v: number) => formatMoney(pesewas(v), dashboard.currency);
  // Today uses the live dashboard figure; longer periods use the insights total.
  const total = range === 'today' ? dashboard.salesTodayPesewas : (report.data?.salesPesewas ?? 0);
  const line = salesLine(dashboard);
  const caption =
    range === 'today'
      ? t(line.key, { amount: money(total), percent: line.percent ?? 0 })
      : t(`ownerDash.rangeCaption.${range}`);
  // Today's series is by hour ("21"); show it as a time so it is not read as a date.
  const label = (l: string) =>
    range === 'today' && /^\d{1,2}$/.test(l) ? `${l.padStart(2, '0')}:00` : l;
  const bars = (report.data?.series ?? []).map((p) => ({
    label: label(p.label),
    value: p.pesewas,
  }));

  return (
    <>
      <Segmented<Range>
        label={t('ownerDash.rangeLabel')}
        value={range}
        onChange={setRange}
        options={RANGES.map((id) => ({ id, label: t(`ownerInsights.range.${id}`) }))}
      />

      <View style={styles.figure} accessible accessibilityLabel={`${money(total)}. ${caption}`}>
        <Text variant="display-l" style={styles.total}>
          {money(total)}
        </Text>
        <Text variant="caption" style={[styles.caption, { color: theme.muted }]}>
          {caption}
        </Text>
      </View>

      {bars.length ? (
        <BarChart bars={bars} format={money} summary={t('ownerInsights.sales')} height={110} />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  figure: { alignItems: 'center', gap: tokens.space[1] },
  total: { fontVariant: ['tabular-nums'] },
  caption: { textAlign: 'center' },
});
