import { ActivityIndicator, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { hapticSelection } from '@/lib/haptics';
import { tokens } from '@/theme/tokens';
import { Text } from './Text';
import { useTheme } from './theme';

type Tone = 'primary' | 'secondary' | 'ghost';

export function Button({
  label,
  onPress,
  tone = 'primary',
  disabled,
  loading,
  style,
}: {
  label: string;
  onPress: () => void;
  tone?: Tone;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: off }}
      disabled={off}
      onPress={() => {
        void hapticSelection();
        onPress();
      }}
      style={({ pressed }) => [
        styles.base,
        tone === 'primary' && { backgroundColor: pressed ? theme.pressed : theme.fill },
        tone === 'secondary' && { backgroundColor: theme.white, borderWidth: 1.5, borderColor: theme.black },
        tone === 'ghost' && { backgroundColor: 'transparent' },
        off && tone === 'primary' && { backgroundColor: theme.wash },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={tone === 'primary' ? theme.onFill : theme.text} />
      ) : (
        <Text variant="button" style={{ color: off ? theme.meta : tone === 'primary' ? theme.onFill : theme.text }}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: tokens.button.height.lg,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tokens.space[4],
  },
});
