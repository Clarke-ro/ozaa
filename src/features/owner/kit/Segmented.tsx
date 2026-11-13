import { Pressable, StyleSheet, View } from 'react-native';
import { hapticSelection } from '@/lib/haptics';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { SHADOW_INK } from '@/theme/palette';

/** iOS-style segmented control for a few mutually exclusive choices (date ranges, filters). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  /** What the choice is about, read by screen readers. */
  label: string;
}) {
  const theme = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={[styles.track, { backgroundColor: theme.line }]}
    >
      {options.map((option) => {
        const on = option.id === value;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ checked: on }}
            onPress={() => {
              if (on) return;
              void hapticSelection();
              onChange(option.id);
            }}
            style={[
              styles.segment,
              on && [styles.on, { backgroundColor: theme.surface, borderColor: theme.line }],
            ]}
          >
            <Text
              numberOfLines={1}
              style={{
                fontSize: 14,
                lineHeight: 20,
                color: on ? theme.text : theme.muted,
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
  // Canvas switch: a rounded grey track, 3 px inset, 34 px white pill on the picked option.
  track: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: tokens.radius.full,
  },
  segment: {
    // Grow to share a wide track, but never squeeze a label narrower than its text.
    flexGrow: 1,
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tokens.space[4],
    borderRadius: tokens.radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  on: {
    shadowColor: SHADOW_INK,
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
});
