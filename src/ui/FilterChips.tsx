import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { STATUS_TONES, type StatusTone } from '@/theme/palette';
import { tokens } from '@/theme/tokens';
import { Text } from './Text';
import { fontFamily, useTheme } from './theme';

export type FilterChip<T extends string> = {
  id: T;
  label: string;
  /** Shown inside the chip, e.g. how many orders are in that stage. */
  count?: number;
  /** Colours the count circle by stage, e.g. Floor's "Needs you" in red (owner app only). */
  tone?: StatusTone;
};

/**
 * The one filter-chip row for the whole app (guest menu, owner Orders, Menu, Payments, Floor).
 * Chips come from data, never typed in place. The picked chip is filled black so the choice
 * reads without colour; counts sit inside the chip.
 *
 * Owner app on a phone (Clarke, 2026-11-14): one slim chip everywhere, 34 px with a 14 px label
 * and the count as plain figures after it ("New 2"), so a row of chips is one short line and
 * more of them fit before it scrolls. Wide screens keep the canvas's 40 px chip.
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
  const { width } = useWindowDimensions();
  // The owner app's phone chips; ui/ can't import the owner layout hook, so it reads the token.
  const slim = Boolean(theme.pill) && width < tokens.owner.wideFrom;
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
        const pill = Boolean(theme.pill) && !slim;
        const tone = item.tone ? STATUS_TONES[theme.scheme][item.tone] : null;
        // Owner canvas: the picked chip's count sits in a white circle; others in grey or the stage tint.
        const countBg = pill
          ? on
            ? theme.surface
            : (tone?.bg ?? theme.wash)
          : on
            ? theme.fill
            : theme.wash;
        const countInk = pill
          ? on
            ? theme.text
            : (tone?.ink ?? theme.text)
          : on
            ? theme.onFill
            : theme.muted;
        return (
          <Pressable
            key={item.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            aria-selected={on}
            accessibilityLabel={item.count == null ? item.label : `${item.label}, ${item.count}`}
            onPress={() => onChange(item.id)}
            hitSlop={{ top: pill ? 2 : 5, bottom: pill ? 2 : 5 }}
            style={({ pressed }) => [
              styles.chip,
              // The owner app's chips are 40 px, as on its design canvas; guest pages keep 34.
              pill && styles.pillChip,
              pill && item.count != null && styles.pillChipCount,
              slim && styles.slimChip,
              {
                borderColor: on ? theme.black : theme.line,
                backgroundColor: on ? theme.black : pressed ? theme.wash : theme.surface,
              },
            ]}
          >
            <Text
              variant="caption"
              numberOfLines={1}
              style={[
                styles.text,
                pill && styles.pillText,
                slim && styles.slimText,
                { color: on ? theme.white : pill || slim ? theme.muted : theme.text },
                slim && on && { fontFamily: fontFamily.strong },
              ]}
            >
              {item.label}
            </Text>
            {item.count != null && slim ? (
              <Text
                style={[
                  styles.slimCount,
                  { color: on ? theme.white : (tone?.ink ?? theme.meta), opacity: on ? 0.75 : 1 },
                ]}
              >
                {item.count}
              </Text>
            ) : item.count != null ? (
              <View style={[styles.count, pill && styles.pillCount, { backgroundColor: countBg }]}>
                <Text
                  variant="caption"
                  style={[styles.countText, pill && styles.pillCountText, { color: countInk }]}
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
  row: { gap: tokens.space[2], paddingVertical: 5, alignItems: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[1] + 2,
    minHeight: HEIGHT,
    paddingHorizontal: tokens.space[3],
    borderRadius: tokens.radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  // Owner canvas chip: 40 px tall, 1 px edge, 15 px label, the count in a 28 px circle.
  pillChip: {
    minHeight: tokens.owner.controls.chipHeight,
    paddingHorizontal: tokens.space[4],
    borderWidth: 1,
    gap: tokens.space[2],
  },
  pillChipCount: { paddingRight: 6 },
  slimChip: { minHeight: 34, paddingHorizontal: tokens.space[3], gap: 6, borderWidth: 1 },
  slimText: { fontSize: 14, lineHeight: 18, fontFamily: fontFamily.regular },
  slimCount: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fontFamily.strong,
    fontVariant: ['tabular-nums'],
  },
  pillText: { fontSize: 15, lineHeight: 20, fontFamily: fontFamily.regular },
  pillCount: { minWidth: 28, height: 28, paddingHorizontal: tokens.space[2] },
  pillCountText: { fontSize: 13, lineHeight: 18 },
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
