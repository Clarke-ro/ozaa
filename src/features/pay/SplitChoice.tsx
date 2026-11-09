import { Pressable, StyleSheet, View } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { tokens } from '@/theme/tokens';
import { FilterChips } from '@/ui/FilterChips';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { payStyles } from './payStyles';

export type SplitMode = 'whole' | 'equal' | 'items';

// The contract allows splitting between 2 and 20 people.
const MIN_PARTS = 2;
const MAX_PARTS = 20;

/** Whole bill, split equally (with a people counter), or just my items. */
export function SplitChoice({
  mode,
  onMode,
  parts,
  onParts,
}: {
  mode: SplitMode;
  onMode: (mode: SplitMode) => void;
  parts: number;
  onParts: (parts: number) => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <View style={payStyles.block}>
      <Text variant="title">{t('pay.how')}</Text>
      <FilterChips<SplitMode>
        label={t('pay.how')}
        value={mode}
        onChange={onMode}
        items={(['whole', 'equal', 'items'] as const).map((id) => ({
          id,
          label: t(`pay.${id}`),
        }))}
      />
      {mode === 'equal' ? (
        <View style={[payStyles.card, styles.people, { backgroundColor: theme.surface }]}>
          <Text variant="body-strong" style={payStyles.flex}>
            {t('pay.people')}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('pay.fewer')}
            onPress={() => onParts(Math.max(MIN_PARTS, parts - 1))}
            style={[styles.step, { backgroundColor: theme.wash }]}
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
            style={[styles.step, { backgroundColor: theme.wash }]}
          >
            <Plus size={18} color={theme.text} />
          </Pressable>
        </View>
      ) : null}
      {mode === 'items' ? (
        <Text variant="caption" style={{ color: theme.muted }}>
          {t('pay.pickItems')}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  people: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] },
  step: {
    width: tokens.touchTarget,
    height: tokens.touchTarget,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  num: { minWidth: 28, textAlign: 'center', fontVariant: ['tabular-nums'] },
});
