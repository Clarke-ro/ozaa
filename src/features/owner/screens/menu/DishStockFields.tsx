import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { DishStatus } from '@/lib/dishRules';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { Chips, Field, Segmented } from '../../kit';
import type { SnoozePick } from './useDishForm';

export type StockDraft = {
  salePrice: string;
  stock: string;
  minQuantity: string;
  maxQuantity: string;
};

/** The dish's status, sale price, stock and per-order limits. All text; `checkStock` reads it. */
export function DishStockFields({
  status,
  onStatus,
  snooze,
  onSnooze,
  back,
  draft,
  onDraft,
  currency,
  error,
}: {
  status: DishStatus;
  onStatus: (status: DishStatus) => void;
  snooze: SnoozePick;
  onSnooze: (pick: SnoozePick) => void;
  /** "17:00" when the dish is snoozed now, so that time can be kept. */
  back: string | null;
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
      <View style={styles.stack}>
        <Text variant="body-strong">{t('ownerMenu.status')}</Text>
        <Segmented
          label={t('ownerMenu.status')}
          value={status}
          onChange={onStatus}
          options={[
            { id: 'available', label: t('ownerMenu.statusAvailable') },
            { id: 'sold_out', label: t('ownerMenu.statusSoldOut') },
            { id: 'hidden', label: t('ownerMenu.statusHidden') },
          ]}
        />
        <Text variant="caption" style={{ color: theme.meta }}>
          {t(`ownerMenu.statusHint.${status}`)}
        </Text>
      </View>
      {status === 'sold_out' ? (
        <View style={styles.stack}>
          <Text variant="body-strong">{t('ownerMenu.snooze.title')}</Text>
          <Chips<SnoozePick>
            single
            label={t('ownerMenu.snooze.title')}
            options={[
              ...(back
                ? [{ id: 'keep' as const, label: t('ownerMenu.snooze.keep', { time: back }) }]
                : []),
              { id: 'off', label: t('ownerMenu.snooze.off') },
              { id: '1h', label: t('ownerMenu.snooze.1h') },
              { id: '2h', label: t('ownerMenu.snooze.2h') },
              { id: 'today', label: t('ownerMenu.snooze.today') },
            ]}
            selected={[snooze]}
            onChange={(ids) => onSnooze(ids[0] ?? 'off')}
          />
          {snooze === 'off' ? null : (
            <Text variant="caption" style={{ color: theme.meta }}>
              {t('ownerMenu.snooze.hint')}
            </Text>
          )}
        </View>
      ) : null}
      <Field
        label={t('ownerMenu.salePrice', { currency })}
        hint={t('ownerMenu.salePriceHint')}
        value={draft.salePrice}
        onChangeText={set('salePrice')}
        placeholder="55.00"
        keyboardType="decimal-pad"
        error={error('salePrice')}
      />
      <Field
        label={t('ownerMenu.stock')}
        hint={t('ownerMenu.stockHint')}
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
