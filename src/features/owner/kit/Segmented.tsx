import { Pressable, StyleSheet, View } from 'react-native';
import { hapticSelection } from '@/lib/haptics';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

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
      style={[styles.track, { backgroundColor: theme.wash }]}
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
              variant="body-strong"
              numberOfLines={1}
              style={{
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
  track: {
    flexDirection: 'row',
    padding: 2,
    borderRadius: tokens.radius.md,
    borderCurve: 'continuous',
  },
  segment: {
    flex: 1,
    minHeight: tokens.touchTarget - 4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tokens.space[2],
    borderRadius: tokens.radius.sm + 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  on: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
});
