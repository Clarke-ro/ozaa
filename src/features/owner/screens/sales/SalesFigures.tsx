import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { SalesReport } from '@/lib/api/types';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { tokens } from '@/theme/tokens';
import { percentChange } from '../../desk/salesCompare';
import { CardGrid, FigureCard, type Trend } from '../../kit';

type Key = 'value' | 'orders' | 'average' | 'completed' | 'inProgress' | 'cancelled' | 'discounts';

/** Whole-pesewa average order value; zero orders means no average, shown as zero. */
function average(r: SalesReport): number {
  return r.orderCount > 0 ? Math.round(r.valuePesewas / r.orderCount) : 0;
}

/**
 * Sales' figure cards. Order value, orders, average order and completed carry the change
 * against the period before when there is one. Wide screens: order value twice as wide with
 * orders and average order beside it, then four in a row. Phones: order value across the full
 * width, the rest two by two.
 */
export function SalesFigures({
  report: r,
  previous,
  vsLabel,
  wide,
}: {
  report: SalesReport;
  /** The same report for the period just before, or null when there is none. */
  previous: SalesReport | null;
  vsLabel: string;
  wide: boolean;
}) {
  const { t } = useTranslation();
  const money = (amount: number) => formatMoney(pesewas(amount), r.currency);
  const values: Record<Key, string> = {
    value: money(r.valuePesewas),
    orders: String(r.orderCount),
    average: money(average(r)),
    completed: String(r.byStatus.served),
    inProgress: String(r.byStatus.received + r.byStatus.preparing + r.byStatus.ready),
    cancelled: String(r.byStatus.cancelled),
    discounts: money(r.discountsPesewas),
  };
  const trend = (now: number, before: number | undefined): Trend | null => {
    if (before === undefined) return null;
    const percent = percentChange(now, before);
    return percent === null ? null : { percent, label: vsLabel };
  };
  const trends: Partial<Record<Key, Trend | null>> = {
    value: trend(r.valuePesewas, previous?.valuePesewas),
    orders: trend(r.orderCount, previous?.orderCount),
    average: previous ? trend(average(r), average(previous)) : null,
    completed: trend(r.byStatus.served, previous?.byStatus.served),
  };
  const card = (key: Key) => (
    <FigureCard
      key={key}
      order="labelFirst"
      label={t(`ownerSales.stats.${key}`)}
      value={values[key]}
      trend={trends[key]}
      note={t(`ownerSales.notes.${key}`)}
    />
  );

  if (wide) {
    return (
      <View style={styles.stack}>
        <View style={styles.row}>
          <View style={styles.double}>{card('value')}</View>
          {card('orders')}
          {card('average')}
        </View>
        <View style={styles.row}>
          {card('completed')}
          {card('inProgress')}
          {card('cancelled')}
          {card('discounts')}
        </View>
      </View>
    );
  }
  return (
    <View style={styles.stack}>
      <View style={styles.row}>{card('value')}</View>
      <CardGrid columns={2}>
        {card('orders')}
        {card('average')}
        {card('completed')}
        {card('inProgress')}
        {card('cancelled')}
        {card('discounts')}
      </CardGrid>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[3] },
  row: { flexDirection: 'row', gap: tokens.space[3] },
  // Takes the room of two cards plus the gap between them.
  double: { flex: 2, flexDirection: 'row' },
});
