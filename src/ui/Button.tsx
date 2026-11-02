import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { hapticImpactLight } from '@/lib/haptics';
import { tokens } from '@/theme/tokens';
import { Text } from './Text';
import { useTheme } from './theme';

type Tone = 'primary' | 'secondary' | 'ghost' | 'destructive';
type Size = 'lg' | 'md';

export function Button({
  label,
  onPress,
  tone = 'primary',
  size = 'lg',
  disabled,
  loading,
  style,
  accessibilityHint,
}: {
  label: string;
  onPress: () => void;
  tone?: Tone;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}) {
  const theme = useTheme();
  const off = disabled || loading;
  const filled = tone === 'primary' || tone === 'destructive';
  // The dark-mode error red is light, so its label flips to the dark page colour to keep 4.5:1.
  const destructiveInk = theme.scheme === 'dark' ? theme.bg : theme.onFill;
  const ink =
    off && filled
      ? theme.meta
      : tone === 'destructive'
        ? destructiveInk
        : filled
          ? theme.onFill
          : theme.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: off, busy: loading }}
      disabled={off}
      onPress={() => {
        // A light tap only on the filled action; secondary taps stay quiet.
        if (filled) void hapticImpactLight();
        onPress();
      }}
      style={({ pressed }) => [
        styles.base,
        { minHeight: tokens.button.height[size] },
        tone === 'primary' && { backgroundColor: pressed ? theme.pressed : theme.fill },
        tone === 'destructive' && { backgroundColor: theme.error, opacity: pressed ? 0.85 : 1 },
        tone === 'secondary' && {
          backgroundColor: pressed ? theme.wash : theme.surface,
          borderWidth: 1.5,
          borderColor: theme.black,
        },
        tone === 'ghost' && { backgroundColor: pressed ? theme.wash : 'transparent' },
        off && filled && { backgroundColor: theme.wash },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={ink} />
      ) : (
        <Text variant="button" style={{ color: ink, textAlign: 'center' }}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: tokens.radius.md,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[2],
  },
});
