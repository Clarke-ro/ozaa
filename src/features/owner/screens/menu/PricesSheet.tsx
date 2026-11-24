import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { MenuItem } from '@/lib/api/types';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { Field, ModalSheet, Segmented } from '../../kit';
import { bulkPrices } from './bulkPrices';

const STEPS = ['10', '50', '100'] as const;

/** A whole or decimal percent from -50 to 100, or null. */
function percentOf(text: string): number | null {
  const value = Number(text.trim().replace(',', '.'));
  return text.trim() !== '' && Number.isFinite(value) && value >= -50 && value <= 100
    ? value
    : null;
}

/**
 * Change prices: the dishes the list shows go up or down by one percent, rounded to a tidy step.
 * One example shows what will happen before anything is saved.
 */
export function PricesSheet({
  dishes,
  currency,
  busy,
  onApply,
  onClose,
}: {
  dishes: MenuItem[];
  currency: string;
  busy: boolean;
  onApply: (percent: number, step: number) => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [step, setStep] = useState<(typeof STEPS)[number]>('50');
  const money = (amount: number) => formatMoney(pesewas(amount), currency);
  const percent = percentOf(text);
  const updates = percent === null ? [] : bulkPrices(dishes, percent, Number(step));
  const first = updates[0];
  const firstDish = first ? dishes.find((d) => d.id === first.id) : undefined;

  return (
    <ModalSheet
      visible
      onClose={onClose}
      title={t('ownerMenu.prices.title')}
      subtitle={t('ownerMenu.prices.lead', { count: dishes.length })}
      footer={
        <Button
          label={t('ownerMenu.prices.apply', { count: updates.length })}
          style={styles.flex}
          loading={busy}
          disabled={updates.length === 0}
          onPress={() => percent !== null && onApply(percent, Number(step))}
        />
      }
    >
      <View style={styles.stack}>
        <Field
          label={t('ownerMenu.prices.percent')}
          value={text}
          onChangeText={setText}
          placeholder={t('ownerMenu.prices.placeholder')}
          keyboardType="numbers-and-punctuation"
          error={text.trim() !== '' && percent === null ? t('ownerMenu.prices.err') : undefined}
        />
        <View style={styles.block}>
          <Text variant="body-strong">{t('ownerMenu.prices.round')}</Text>
          <Segmented
            label={t('ownerMenu.prices.round')}
            value={step}
            onChange={setStep}
            options={STEPS.map((id) => ({ id, label: money(Number(id)) }))}
          />
        </View>
        {percent === null ? null : (
          <Text variant="caption" style={{ color: theme.muted }}>
            {first && firstDish
              ? t('ownerMenu.prices.example', {
                  name: firstDish.name.en,
                  from: money(firstDish.pricePesewas),
                  to: money(first.pricePesewas),
                })
              : t('ownerMenu.prices.none')}
          </Text>
        )}
      </View>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[4] },
  block: { gap: tokens.space[2] },
  flex: { flex: 1 },
});
