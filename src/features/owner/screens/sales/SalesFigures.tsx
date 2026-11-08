import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { SalesReport } from '@/lib/api/types';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { tokens } from '@/theme/tokens';
import { CardGrid, FigureCard } from '../../kit';

type Key = 'value' | 'orders' | 'completed' | 'inProgress' | 'cancelled' | 'discounts';

/**
 * Sales' six figure cards. Wide screens: order value twice as wide with orders and completed
 * beside it, then the other three in a row. Phones: order value across the full width, the
 * rest two by two.
 */
export function SalesFigures({ report: r, wide }: { report: SalesReport; wide: boolean }) {
  const { t } = useTranslation();
  const money = (amount: number) => formatMoney(pesewas(amount), r.currency);
  const values: Record<Key, string> = {
    value: money(r.valuePesewas),
    orders: String(r.orderCount),
    completed: String(r.byStatus.served),
    inProgress: String(r.byStatus.received + r.byStatus.preparing + r.byStatus.ready),
    cancelled: String(r.byStatus.cancelled),
    discounts: money(r.discountsPesewas),
  };
  const card = (key: Key) => (
    <FigureCard
      key={key}
      order="labelFirst"
      label={t(`ownerSales.stats.${key}`)}
      value={values[key]}
      note={t(`ownerSales.notes.${key}`)}
    />
  );

  if (wide) {
    return (
      <View style={styles.stack}>
        <View style={styles.row}>
          <View style={styles.double}>{card('value')}</View>
          {card('orders')}
          {card('completed')}
        </View>
        <View style={styles.row}>
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
