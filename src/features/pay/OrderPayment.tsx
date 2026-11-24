import { StyleSheet, View } from 'react-native';
import { Lock } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { MethodBoxes } from './MethodBoxes';
import { PaySummary } from './PaySummary';
import { BillSplit, type SplitDish } from './BillSplit';
import { TipBoxes } from './TipBoxes';
import { payStyles } from './payStyles';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import type { PayInput, PayPick } from './payPick';

/**
 * The payment part of the order page (design canvas, Clarke 2026-11-23). Whole bill, no tip
 * and MoMo are chosen to start with. Cash is paid in person later, so it has no split or tip.
 */
export function OrderPayment({
  input,
  onInput,
  methods,
  dishes,
  table,
  delivery,
  summary,
  venueName,
  currency,
  testMode = false,
}: {
  input: PayInput;
  onInput: (next: PayInput) => void;
  methods: PayPick[];
  /** The basket, for My items. */
  dishes: SplitDish[];
  table: boolean;
  delivery: boolean;
  summary: { share: number; tip: number; fee: number; due: number };
  venueName: string;
  currency: string;
  /** The venue uses Paystack test keys: nothing is charged. */
  testMode?: boolean;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const cash = input.pick === 'cash';
  return (
    <View style={styles.wrap}>
      {/* Splitting is for a table sharing a bill; a pickup or delivery order is paid whole. */}
      {table && !cash ? (
        <BillSplit
          mode={input.mode}
          onMode={(mode) => onInput({ ...input, mode })}
          parts={input.parts}
          onParts={(parts) => onInput({ ...input, parts })}
          dishes={dishes}
          mine={input.mine}
          onMine={(mine) => onInput({ ...input, mine })}
          currency={currency}
        />
      ) : null}
      {cash ? null : <TipBoxes value={input.tip} onChange={(tip) => onInput({ ...input, tip })} />}
      <View style={payStyles.block}>
        <Text variant="title" accessibilityRole="header">
          {t('pay.with')}
        </Text>
        <MethodBoxes
          methods={methods}
          value={input.pick}
          onChange={(pick) => onInput({ ...input, pick })}
          delivery={delivery}
        />
      </View>
      <PaySummary {...summary} currency={currency} />
      {testMode && !cash ? (
        <Text variant="caption" style={[styles.center, { color: theme.meta }]}>
          {t('pay.test')}
        </Text>
      ) : null}
      {cash ? null : (
        <View style={styles.secure}>
          <Lock size={16} color={theme.success} strokeWidth={2} />
          <Text variant="caption" style={[styles.secureText, { color: theme.muted }]}>
            {t('payment.secure', { venue: venueName })}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.space[6] },
  secure: { flexDirection: 'row', gap: tokens.space[2], alignItems: 'flex-start' },
  secureText: { flex: 1 },
  center: { textAlign: 'center' },
});
