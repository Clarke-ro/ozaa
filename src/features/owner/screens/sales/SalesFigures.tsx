import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { SalesReport } from '@/lib/api/types';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { tokens } from '@/theme/tokens';
import { percentChange } from '../../desk/salesCompare';
import { CardGrid, FigureCard, type Trend } from '../../kit';

type Key = 'value' | 'orders' | 'average' | 'discounts' | 'refunds';

// The five figures on the canvas, in its order. How orders ended up has its own card below.
const KEYS: readonly Key[] = ['value', 'orders', 'average', 'discounts', 'refunds'];
const GROW: Record<Key, number> = { value: 1.4, orders: 1, average: 1.2, discounts: 1, refunds: 1 };

/** Whole-pesewa average order value; zero orders means no average, shown as zero. */
function average(r: SalesReport): number {
  return r.orderCount > 0 ? Math.round(r.valuePesewas / r.orderCount) : 0;
}

/**
 * Sales' five figure cards in one row (design canvas): order value, orders, average order,
 * discounts and refunds. The first three carry the change against the period before, the last
 * two a short note. Phones show them two by two.
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
    discounts: money(r.discountsPesewas),
    refunds: money(r.refundsPesewas ?? 0),
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
  };
  const card = (key: Key) => (
    <FigureCard
      key={key}
      order="labelFirst"
      label={t(`ownerSales.stats.${key}`)}
      value={values[key]}
      trend={trends[key]}
      note={trends[key] ? undefined : t(`ownerSales.notes.${key}`)}
      compact
    />
  );

  // Money needs more room than counts, so a five-figure amount is never cut off.
  if (wide) {
    return (
      <View style={styles.row}>
        {KEYS.map((key) => (
          <View key={key} style={[styles.cell, { flexGrow: GROW[key] }]}>
            {card(key)}
          </View>
        ))}
      </View>
    );
  }
  return <CardGrid columns={2}>{KEYS.map(card)}</CardGrid>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: tokens.owner.controls.listGap },
  cell: { flexBasis: 0, minWidth: 0, flexDirection: 'row' },
});
