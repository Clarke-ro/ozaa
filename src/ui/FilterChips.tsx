import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { tokens } from '@/theme/tokens';
import { Text } from './Text';
import { fontFamily, useTheme } from './theme';

export type FilterChip<T extends string> = {
  id: T;
  label: string;
  /** Shown inside the chip, e.g. how many orders are in that stage. */
  count?: number;
};

/**
 * The one filter-chip row for the whole app (guest menu, owner Orders, Menu, Payments, Floor).
 * Chips come from data, never typed in place. The picked chip is filled black so the choice
 * reads without colour; counts sit inside the chip.
 */
export function FilterChips<T extends string>({
  items,
  value,
  onChange,
  label,
  gutter = 0,
}: {
  items: readonly FilterChip<T>[];
  value: T;
  onChange: (id: T) => void;
  /** What the chips choose, read by screen readers. */
  label?: string;
  /** Side padding inside the scroll, so the first chip lines up with the page edge. */
  gutter?: number;
}) {
  const theme = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="tablist"
      accessibilityLabel={label}
      contentContainerStyle={[styles.row, { paddingHorizontal: gutter }]}
    >
      {items.map((item) => {
        const on = item.id === value;
        return (
          <Pressable
            key={item.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            aria-selected={on}
            accessibilityLabel={item.count == null ? item.label : `${item.label}, ${item.count}`}
            onPress={() => onChange(item.id)}
            style={({ pressed }) => [
              styles.chip,
              // The owner app's chips are 40 px, as on its design canvas; guest pages keep 34.
              theme.pill && {
                height: tokens.owner.controls.chipHeight,
                paddingHorizontal: tokens.space[4],
              },
              {
                borderColor: on ? theme.black : theme.line,
                backgroundColor: on ? theme.black : pressed ? theme.wash : theme.surface,
              },
            ]}
          >
            <Text
              variant="caption"
              numberOfLines={1}
              style={[styles.text, { color: on ? theme.white : theme.text }]}
            >
              {item.label}
            </Text>
            {item.count != null ? (
              <View style={[styles.count, { backgroundColor: on ? theme.fill : theme.wash }]}>
                <Text
                  variant="caption"
                  style={[styles.countText, { color: on ? theme.onFill : theme.muted }]}
                >
                  {item.count}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const HEIGHT = 34;

const styles = StyleSheet.create({
  row: { gap: tokens.space[2], paddingVertical: 2, alignItems: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[1] + 2,
    height: HEIGHT,
    paddingHorizontal: tokens.space[3],
    borderRadius: tokens.radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  text: { fontFamily: fontFamily.strong },
  count: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: tokens.space[1] + 2,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { fontFamily: fontFamily.strong, fontVariant: ['tabular-nums'] },
});
