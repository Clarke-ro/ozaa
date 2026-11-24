import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Minus, Pencil, Plus, Trash2, UtensilsCrossed } from 'lucide-react-native';
import type { CartLine } from '@/features/cart';
import type { MenuItem } from '@/lib/api/types';
import { pesewas } from '@/lib/brand';
import { hapticSelection } from '@/lib/haptics';
import { formatMoney } from '@/lib/money';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { VenueImage } from '@/ui/VenueImage';
import { useTheme } from '@/ui/theme';

const PHOTO = 60;
const STEP = 28;
// Grows each step button to the 44 pt minimum touch area (HIG).
const STEP_SLOP = (44 - STEP) / 2;

/**
 * One dish in the order summary, as its own grey card (design canvas, Clarke 2026-11-23): the
 * photo, the name and line price, − / +, an Edit link to the dish's page and a bin to remove it.
 */
export function OrderItemCard({
  line,
  photo,
  currency,
  onQuantity,
  onEdit,
}: {
  line: CartLine;
  photo: MenuItem['photo'];
  currency: string;
  /** 0 takes the dish out of the order. */
  onQuantity: (quantity: number) => void;
  onEdit: () => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const price = pesewas((line.unitPricePesewas + line.modifierPesewas) * line.quantity);
  const step = (quantity: number) => {
    void hapticSelection();
    onQuantity(quantity);
  };
  const stepStyle = [styles.step, { borderColor: theme.line, backgroundColor: theme.white }];
  return (
    <View style={[styles.card, { backgroundColor: theme.wash }]}>
      <View style={[styles.photo, { backgroundColor: theme.line }]}>
        {photo ? (
          <VenueImage url={photo.url} alt="" style={StyleSheet.absoluteFill} />
        ) : (
          <UtensilsCrossed size={20} color={theme.meta} />
        )}
      </View>
      <View style={styles.middle}>
        <Text variant="body-strong" numberOfLines={2}>
          {line.name}
        </Text>
        {line.note ? (
          <Text variant="caption" numberOfLines={1} style={{ color: theme.muted }}>
            {line.note}
          </Text>
        ) : null}
        <Text variant="body-strong" style={[styles.price, { color: theme.ink }]}>
          {formatMoney(price, currency)}
        </Text>
        <View style={styles.stepper}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('basket.less', { name: line.name })}
            hitSlop={STEP_SLOP}
            onPress={() => step(line.quantity - 1)}
            style={stepStyle}
          >
            <Minus size={14} color={theme.text} strokeWidth={2.5} />
          </Pressable>
          <Text variant="body-strong" style={styles.count} accessibilityLiveRegion="polite">
            {line.quantity}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('basket.more', { name: line.name })}
            hitSlop={STEP_SLOP}
            onPress={() => step(line.quantity + 1)}
            style={stepStyle}
          >
            <Plus size={14} color={theme.text} strokeWidth={2.5} />
          </Pressable>
        </View>
      </View>
      <View style={styles.side}>
        <Pressable
          accessibilityRole="link"
          onPress={onEdit}
          hitSlop={tokens.space[2]}
          style={styles.edit}
        >
          <Pencil size={13} color={theme.text} strokeWidth={2.5} />
          <Text variant="caption" style={styles.editText}>
            {t('basket.edit')}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('basket.remove', { name: line.name })}
          onPress={() => step(0)}
          style={styles.bin}
        >
          <Trash2 size={22} color={theme.error} strokeWidth={2} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3] + 2,
    padding: tokens.space[3],
    paddingEnd: tokens.space[2],
    borderRadius: tokens.radius.md,
    borderCurve: 'continuous',
  },
  photo: {
    width: PHOTO,
    height: PHOTO,
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  middle: { flex: 1, minWidth: 0, gap: 3 },
  price: { fontVariant: ['tabular-nums'] },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2], marginTop: 2 },
  step: {
    width: STEP,
    height: STEP,
    borderRadius: STEP / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: { minWidth: 14, textAlign: 'center', fontVariant: ['tabular-nums'] },
  side: { alignSelf: 'stretch', alignItems: 'flex-end', justifyContent: 'space-between' },
  edit: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingTop: 2 },
  editText: { fontWeight: '600' },
  bin: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
