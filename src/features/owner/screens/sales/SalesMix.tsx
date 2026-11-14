import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { SalesReport } from '@/lib/api/types';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { BarList, TitledSection } from '../../kit';
import { paymentShares } from './salesModel';

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
const SOURCES = ['table', 'pickup', 'delivery'] as const;

/**
 * Three cards side by side (design canvas): how it was paid as a share of order value, where
 * orders came from, and how orders stand now.
 */
export function SalesMix({ report: r, wide }: { report: SalesReport; wide: boolean }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const money = (amount: number) => formatMoney(pesewas(amount), r.currency);
  const payments = paymentShares(r).map((row) => ({
    key: row.key,
    label: row.key === 'unpaid' ? t('ownerSales.unpaid') : t(`ownerSales.method.${row.key}`),
    value: `${row.percent}%`,
    share: row.percent,
  }));
  const sources = SOURCES.map((source) => {
    const row = r.bySource.find((s) => s.source === source);
    const orders = row?.orders ?? 0;
    return {
      key: source,
      label: t(`ownerSales.source.${source}`),
      sub: `· ${t('ownerSales.orders', { count: orders })}`,
      value: money(row?.pesewas ?? 0),
      share: pct(row?.pesewas ?? 0, r.valuePesewas),
    };
  });
  const s = r.byStatus;
  const inProgress = s.received + s.preparing + s.ready;
  const all = inProgress + s.served + s.cancelled;
  const status = [
    { key: 'progress', label: t('ownerSales.stats.inProgress'), count: inProgress },
    { key: 'completed', label: t('ownerSales.stats.completed'), count: s.served },
    { key: 'cancelled', label: t('ownerSales.stats.cancelled'), count: s.cancelled },
  ].map((row) => ({
    key: row.key,
    label: row.label,
    value: t('ownerSales.orders', { count: row.count }),
    share: pct(row.count, all),
  }));
  const col = wide ? styles.col : undefined;
  return (
    <View style={[styles.row, !wide && styles.stack]}>
      <View style={[col, styles.gap]}>
        <TitledSection title={t('ownerSales.payments')} cardStyle={styles.card}>
          <BarList rows={payments} />
        </TitledSection>
        <Text style={[styles.note, { color: theme.meta }]}>{t('ownerSales.paymentsNote')}</Text>
      </View>
      <TitledSection title={t('ownerSales.bySource')} style={col} cardStyle={styles.card}>
        <BarList rows={sources} />
      </TitledSection>
      <TitledSection title={t('ownerSales.orderStatus')} style={col} cardStyle={styles.card}>
        <BarList rows={status} />
      </TitledSection>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: tokens.space[6] },
  stack: { flexDirection: 'column', alignItems: 'stretch' },
  col: { flex: 1, minWidth: 0 },
  gap: { gap: tokens.space[2] },
  card: { flex: 0, paddingVertical: 6, paddingHorizontal: tokens.owner.controls.cardPadding },
  note: { fontSize: 13, lineHeight: 18 },
});
