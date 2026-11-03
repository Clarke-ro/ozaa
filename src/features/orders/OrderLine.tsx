import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Minus, Plus } from 'lucide-react-native';
import type { CartLine } from '@/features/cart';
import { pesewas } from '@/lib/brand';
import { hapticSelection } from '@/lib/haptics';
import { formatMoney } from '@/lib/money';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';

const STEP = 32;
// Grows each 32 pt step button to the 44 pt minimum touch area (HIG).
const STEP_SLOP = (44 - STEP) / 2;

/** One dish in the order: name, its note, the line price, and − / + to change how many. */
export function OrderLine({
  line,
  currency,
  onQuantity,
}: {
  line: CartLine;
  currency: string;
  /** 0 takes the dish out of the order. */
  onQuantity: (quantity: number) => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const price = pesewas((line.unitPricePesewas + line.modifierPesewas) * line.quantity);
  const step = (quantity: number) => {
    void hapticSelection();
    onQuantity(quantity);
  };
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <Text variant="body-strong">{line.name}</Text>
        {line.note ? (
          <Text variant="caption" numberOfLines={2} style={{ color: theme.muted }}>
            {line.note}
          </Text>
        ) : null}
        <Text variant="body" style={[styles.price, { color: theme.muted }]}>
          {formatMoney(price, currency)}
        </Text>
      </View>
      <View style={[styles.stepper, { borderColor: theme.line }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('basket.less', { name: line.name })}
          hitSlop={STEP_SLOP}
          onPress={() => step(line.quantity - 1)}
          style={styles.step}
        >
          <Minus size={16} color={theme.text} strokeWidth={2} />
        </Pressable>
        <Text variant="body-strong" style={styles.count} accessibilityLiveRegion="polite">
          {line.quantity}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('basket.more', { name: line.name })}
          hitSlop={STEP_SLOP}
          onPress={() => step(line.quantity + 1)}
          style={styles.step}
        >
          <Plus size={16} color={theme.ink} strokeWidth={2} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    padding: tokens.space[4],
  },
  text: { flex: 1, gap: 2 },
  price: { fontVariant: ['tabular-nums'] },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: tokens.radius.full,
    paddingHorizontal: tokens.space[1],
  },
  step: { width: STEP, height: STEP, alignItems: 'center', justifyContent: 'center' },
  count: {
    minWidth: 24,
    textAlign: 'center',
    fontFamily: fontFamily.strong,
    fontVariant: ['tabular-nums'],
  },
});
