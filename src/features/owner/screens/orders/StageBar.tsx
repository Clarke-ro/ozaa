import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import type { OrderTab } from '../../desk/ops';

/**
 * The kitchen stages as four equal buttons with the count big enough to read from across the
 * pass. The chosen stage is filled black; orange stays on the action buttons.
 */
export function StageBar({
  value,
  counts,
  onChange,
}: {
  value: OrderTab;
  counts: Record<OrderTab, number | null>;
  onChange: (tab: OrderTab) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const tabs: OrderTab[] = ['new', 'cooking', 'ready', 'done'];
  return (
    <View accessibilityRole="tablist" style={styles.row}>
      {tabs.map((id) => {
        const on = id === value;
        const count = counts[id];
        const label = t(`ownerOrders.tabs.${id}`);
        return (
          <Pressable
            key={id}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={count == null ? label : t('ownerOrders.stage', { label, count })}
            onPress={() => onChange(id)}
            style={({ pressed }) => [
              styles.stage,
              {
                backgroundColor: on ? theme.black : pressed ? theme.wash : theme.surface,
                borderColor: on ? theme.black : theme.line,
              },
            ]}
          >
            <Text
              variant="title"
              style={[styles.count, { color: on ? theme.white : count ? theme.text : theme.meta }]}
            >
              {count == null ? '–' : count}
            </Text>
            <Text
              variant="caption"
              numberOfLines={1}
              style={{ color: on ? theme.white : theme.muted, fontFamily: 'Inter_600' }}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: tokens.space[2] },
  stage: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    minHeight: 64,
    justifyContent: 'center',
    paddingVertical: tokens.space[2],
    borderWidth: 1,
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
  },
  count: { fontVariant: ['tabular-nums'], fontSize: 22, lineHeight: 28 },
});
