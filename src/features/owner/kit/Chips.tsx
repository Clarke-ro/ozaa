import { Pressable, StyleSheet, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { hapticSelection } from '@/lib/haptics';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
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
}: {
  options: readonly { id: T; label: string }[];
  selected: readonly T[];
  onChange: (next: T[]) => void;
  /** What is being picked, read by screen readers. */
  label: string;
  single?: boolean;
}) {
  const theme = useTheme();
  return (
    <View
      accessibilityRole={single ? 'radiogroup' : undefined}
      accessibilityLabel={label}
      style={styles.wrap}
    >
      {options.map((option) => {
        const on = selected.includes(option.id);
        return (
          <Pressable
            key={String(option.id)}
            accessibilityRole={single ? 'radio' : 'checkbox'}
            accessibilityState={{ checked: on }}
            accessibilityLabel={option.label}
            onPress={() => {
              void hapticSelection();
              if (single) onChange([option.id]);
              else
                onChange(on ? selected.filter((id) => id !== option.id) : [...selected, option.id]);
            }}
            style={({ pressed }) => [
              styles.chip,
              {
                borderColor: on ? theme.ink : theme.line,
                backgroundColor: on ? theme.tint : pressed ? theme.wash : theme.surface,
              },
            ]}
          >
            {on ? <Check size={14} color={theme.badgeInk} strokeWidth={3} /> : null}
            <Text
              variant="body"
              style={{
                color: on ? theme.badgeInk : theme.text,
                fontFamily: on ? 'Inter_600' : 'Inter_400',
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[2] },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[1],
    minHeight: 40,
    paddingHorizontal: tokens.space[3],
    borderWidth: 1,
    borderRadius: tokens.radius.full,
  },
});
