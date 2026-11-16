import { Pressable, StyleSheet, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { hapticSelection } from '@/lib/haptics';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useOwnerLayout } from '../chrome/layout';
import { useTheme } from '@/ui/theme';

/**
 * Wrapping chips for picking one (`single`) or many. A picked chip gets a tick as well as the fill,
 * so the choice never rests on colour alone.
 */
export function Chips<T extends string | number>({
  options,
  selected,
  onChange,
  label,
  single,
  filled,
}: {
  options: readonly { id: T; label: string }[];
  selected: readonly T[];
  onChange: (next: T[]) => void;
  /** What is being picked, read by screen readers. */
  label: string;
  single?: boolean;
  /** Canvas cuisine chips: a picked chip is solid in the brand colour, with no tick. */
  filled?: boolean;
}) {
  const theme = useTheme();
  // Phones: the same slim 34 px chip as the filter rows (FilterChips), with a 14 px label.
  const { wide } = useOwnerLayout();
  return (
    <View
      accessibilityRole={single ? 'radiogroup' : undefined}
      accessibilityLabel={label}
      style={styles.wrap}
    >
      {options.map((option) => {
        const on = selected.includes(option.id);
        return (
          <View key={String(option.id)} style={!wide && styles.slimTarget}>
            <Pressable
              accessibilityRole={single ? 'radio' : 'checkbox'}
              aria-checked={on}
              accessibilityLabel={option.label}
              hitSlop={wide ? undefined : { top: 5, bottom: 5 }}
              onPress={() => {
                void hapticSelection();
                if (single) onChange([option.id]);
                else
                  onChange(
                    on ? selected.filter((id) => id !== option.id) : [...selected, option.id],
                  );
              }}
              style={({ pressed }) => [
                styles.chip,
                styles.size,
                filled && styles.big,
                !wide && styles.slim,
                {
                  borderColor: on ? (filled ? theme.fill : theme.ink) : theme.line,
                  backgroundColor: on
                    ? filled
                      ? theme.fill
                      : theme.tint
                    : pressed
                      ? theme.wash
                      : theme.surface,
                },
              ]}
            >
              {on && !filled ? <Check size={14} color={theme.badgeInk} strokeWidth={3} /> : null}
              <Text
                variant="body"
                style={[
                  {
                    color: on ? (filled ? theme.onFill : theme.badgeInk) : theme.text,
                    fontFamily: on ? 'Inter_600' : 'Inter_400',
                  },
                  !wide && styles.slimText,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[2] },
  slimTarget: { minHeight: tokens.touchTarget, justifyContent: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[1],
    borderWidth: 1,
    borderRadius: tokens.radius.full,
  },
  size: { minHeight: 40, paddingHorizontal: tokens.space[3] },
  // Canvas cuisine chips are a touch larger: 48 px tall, 20 px either side.
  big: { minHeight: 48, paddingHorizontal: 20 },
  slim: { minHeight: 34, paddingHorizontal: tokens.space[3] },
  slimText: { fontSize: 14, lineHeight: 18 },
});
