import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { Field } from '../../kit';
import { fieldStyles } from './fieldStyles';

export type StockDraft = {
  salePrice: string;
  stock: string;
  minQuantity: string;
  maxQuantity: string;
};

/** The dish's stock and per-order limits. All text; `checkStock` reads it (with the sale price). */
export function DishStockFields({
  draft,
  onDraft,
  error,
}: {
  draft: StockDraft;
  onDraft: (draft: StockDraft) => void;
  /** The message for a field that failed, already translated. */
  error: (field: 'salePrice' | 'stock' | 'quantity') => string | undefined;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const set = (key: keyof StockDraft) => (text: string) => onDraft({ ...draft, [key]: text });
  return (
    <>
      <Field
        label={t('ownerMenu.stock')}
        value={draft.stock}
        onChangeText={set('stock')}
        placeholder={t('ownerMenu.stockPlaceholder')}
        keyboardType="number-pad"
        error={error('stock')}
      />
      <View style={fieldStyles.pair}>
        <View style={fieldStyles.half}>
          <Field
            label={t('ownerMenu.minQuantity')}
            value={draft.minQuantity}
            onChangeText={set('minQuantity')}
            placeholder="1"
            keyboardType="number-pad"
          />
        </View>
        <View style={fieldStyles.half}>
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
    </>
  );
}
