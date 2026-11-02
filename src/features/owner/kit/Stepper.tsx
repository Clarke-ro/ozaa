import { Pressable, StyleSheet, View } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { hapticSelection } from '@/lib/haptics';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

/** − value + control for small whole numbers. Screen readers can swipe up and down to change it. */
export function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  const theme = useTheme();
  const set = (n: number) => {
    const next = Math.min(max, Math.max(min, n));
    if (next === value) return;
    void hapticSelection();
    onChange(next);
  };
  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min, max, now: value }}
      onAccessibilityAction={(e) =>
        set(e.nativeEvent.actionName === 'increment' ? value + 1 : value - 1)
      }
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      style={[styles.wrap, { borderColor: theme.line }]}
    >
      <Pressable
        onPress={() => set(value - 1)}
        disabled={value <= min}
        style={styles.btn}
        importantForAccessibility="no"
      >
        <Minus size={18} color={value <= min ? theme.meta : theme.text} />
      </Pressable>
      <Text variant="body-strong" style={styles.value}>
        {value}
      </Text>
      <Pressable
        onPress={() => set(value + 1)}
        disabled={value >= max}
        style={styles.btn}
        importantForAccessibility="no"
      >
        <Plus size={18} color={value >= max ? theme.meta : theme.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: tokens.radius.full,
  },
  btn: {
    width: tokens.touchTarget,
    height: tokens.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { minWidth: 28, textAlign: 'center', fontVariant: ['tabular-nums'] },
});
