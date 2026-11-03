import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { MenuItem } from '@/lib/api/types';
import { pesewas } from '@/lib/brand';
import { onSale, unitPrice } from '@/lib/dishRules';
import { DEFAULT_CURRENCY, formatMoney } from '@/lib/money';
import { tokens } from '@/theme/tokens';
import { PriceText } from '@/ui/PriceText';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

/**
 * What the guest pays for one. On a sale, the normal price follows, crossed out and muted, and a
 * screen reader hears "Now GH₵40, was GH₵50" instead of two numbers in a row.
 */
export function DishPrice({
  item,
  currency = DEFAULT_CURRENCY,
  size = 'body',
}: {
  item: Pick<MenuItem, 'pricePesewas' | 'available' | 'salePricePesewas'>;
  currency?: string;
  size?: 'body' | 'title';
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const now = unitPrice(item);
  if (!onSale(item)) return <PriceText amount={now} currency={currency} size={size} />;
  const money = (amount: number) => formatMoney(pesewas(amount), currency);
  return (
    <View
      accessible
      accessibilityLabel={t('menu.salePrice', { now: money(now), was: money(item.pricePesewas) })}
      style={styles.row}
    >
      <PriceText amount={now} currency={currency} size={size} />
      <Text variant="caption" style={[styles.was, { color: theme.meta }]}>
        {money(item.pricePesewas)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline', gap: tokens.space[1] },
  was: { textDecorationLine: 'line-through', fontVariant: ['tabular-nums'] },
});
