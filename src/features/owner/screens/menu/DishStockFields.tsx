import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { Field } from '../../kit';

export type StockDraft = {
  salePrice: string;
  stock: string;
  minQuantity: string;
  maxQuantity: string;
};

/** The dish's sale price, stock and per-order limits. All text; `checkStock` reads it. */
export function DishStockFields({
  draft,
  onDraft,
  currency,
  error,
}: {
  draft: StockDraft;
  onDraft: (draft: StockDraft) => void;
  currency: string;
  /** The message for a field that failed, already translated. */
  error: (field: 'salePrice' | 'stock' | 'quantity') => string | undefined;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const set = (key: keyof StockDraft) => (text: string) => onDraft({ ...draft, [key]: text });
  return (
    <View style={styles.stack}>
      <Field
        label={t('ownerMenu.salePrice', { currency })}
        value={draft.salePrice}
        onChangeText={set('salePrice')}
        placeholder="55.00"
        keyboardType="decimal-pad"
        error={error('salePrice')}
      />
      <Field
        label={t('ownerMenu.stock')}
        value={draft.stock}
        onChangeText={set('stock')}
        placeholder={t('ownerMenu.stockPlaceholder')}
        keyboardType="number-pad"
        error={error('stock')}
      />
      <View style={styles.row}>
        <View style={styles.flex}>
          <Field
            label={t('ownerMenu.minQuantity')}
            value={draft.minQuantity}
            onChangeText={set('minQuantity')}
            placeholder="1"
            keyboardType="number-pad"
          />
        </View>
        <View style={styles.flex}>
          <Field
            label={t('ownerMenu.maxQuantity')}
            value={draft.maxQuantity}
            onChangeText={set('maxQuantity')}
            placeholder="50"
            keyboardType="number-pad"
          />
        </View>
      </View>
      {error('quantity') ? (
        <Text variant="caption" style={{ color: theme.error }}>
          {error('quantity')}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[2] },
  row: { flexDirection: 'row', gap: tokens.space[3] },
  // minWidth 0 lets the two fields share a phone-width row on the web.
  flex: { flex: 1, minWidth: 0 },
});
