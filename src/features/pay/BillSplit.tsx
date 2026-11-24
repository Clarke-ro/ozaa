import { Pressable, StyleSheet, View } from 'react-native';
import { Check, Minus, Plus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { formatMoney } from '@/lib/money';
import { pesewas } from '@/lib/brand';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import type { SplitMode } from './SplitChoice';

// The contract allows splitting between 2 and 20 people.
const MIN_PARTS = 2;
const MAX_PARTS = 20;
const MODES: readonly SplitMode[] = ['whole', 'equal', 'items'];

export type SplitDish = { key: string; name: string; totalPesewas: number };

/**
 * "How are you paying?" on the order page, as the design canvas draws it (Clarke, 2026-11-23):
 * a grey track with Whole bill, Split equally and My items, the chosen one a white segment.
 * Split equally adds a people counter; My items lists the dishes to tick.
 */
export function BillSplit({
  mode,
  onMode,
  parts,
  onParts,
  dishes,
  mine,
  onMine,
  currency,
}: {
  mode: SplitMode;
  onMode: (mode: SplitMode) => void;
  parts: number;
  onParts: (parts: number) => void;
  dishes: SplitDish[];
  mine: string[];
  onMine: (keys: string[]) => void;
  currency: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <View style={styles.block}>
      <Text variant="title" accessibilityRole="header">
        {t('pay.how')}
      </Text>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={t('pay.how')}
        style={[styles.track, { backgroundColor: theme.track }]}
      >
        {MODES.map((id) => {
          const on = id === mode;
          return (
            <Pressable
              key={id}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              aria-checked={on}
              onPress={() => onMode(id)}
              style={[styles.segment, on && [styles.segmentOn, { backgroundColor: theme.white }]]}
            >
              <Text
                variant="caption"
                numberOfLines={1}
                style={[
                  styles.segmentText,
                  on && styles.strong,
                  { color: on ? theme.text : theme.muted },
                ]}
              >
                {t(`pay.${id}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {mode === 'equal' ? (
        <View style={[styles.card, { backgroundColor: theme.wash }]}>
          <Text variant="body-strong" style={styles.flex}>
            {t('pay.people')}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('pay.fewer')}
            onPress={() => onParts(Math.max(MIN_PARTS, parts - 1))}
            style={[styles.step, { borderColor: theme.line, backgroundColor: theme.white }]}
          >
            <Minus size={18} color={theme.text} />
          </Pressable>
          <Text variant="title" style={styles.num}>
            {parts}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('pay.more')}
            onPress={() => onParts(Math.min(MAX_PARTS, parts + 1))}
            style={[styles.step, { borderColor: theme.line, backgroundColor: theme.white }]}
          >
            <Plus size={18} color={theme.text} />
          </Pressable>
        </View>
      ) : null}

      {mode === 'items' ? (
        <View style={styles.list}>
          <Text variant="caption" style={{ color: theme.muted }}>
            {t('pay.pickItems')}
          </Text>
          {dishes.map((dish) => {
            const on = mine.includes(dish.key);
            return (
              <Pressable
                key={dish.key}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                aria-checked={on}
                onPress={() =>
                  onMine(on ? mine.filter((k) => k !== dish.key) : [...mine, dish.key])
                }
                style={[styles.card, { backgroundColor: theme.wash }]}
              >
                <View
                  style={[
                    styles.box,
                    {
                      borderColor: on ? theme.fill : theme.meta,
                      backgroundColor: on ? theme.fill : 'transparent',
                    },
                  ]}
                >
                  {on ? <Check size={14} color={theme.onFill} strokeWidth={3} /> : null}
                </View>
                <Text variant="body" numberOfLines={1} style={styles.flex}>
                  {dish.name}
                </Text>
                <Text variant="body-strong" style={styles.num}>
                  {formatMoney(pesewas(dish.totalPesewas), currency)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: tokens.space[3] },
  track: { flexDirection: 'row', padding: 4, borderRadius: tokens.radius.md, gap: 4 },
  segment: {
    flex: 1,
    minHeight: 40,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tokens.space[1],
  },
  segmentOn: { boxShadow: '0 1px 3px rgba(17, 17, 17, 0.12)' },
  segmentText: { fontSize: 14, lineHeight: 18 },
  strong: { fontWeight: '600' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    minHeight: 56,
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[2],
    borderRadius: tokens.radius.md,
  },
  flex: { flex: 1 },
  step: {
    width: tokens.touchTarget,
    height: tokens.touchTarget,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  num: { minWidth: 24, textAlign: 'center', fontVariant: ['tabular-nums'] },
  list: { gap: tokens.space[2] },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
