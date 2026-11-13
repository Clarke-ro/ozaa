import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { hapticImpactLight } from '@/lib/haptics';
import { STATUS_TONES, type StatusTone } from '@/theme/palette';
import { tokens } from '@/theme/tokens';
import { Text } from './Text';
import { useTheme } from './theme';

type Tone = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'tinted';
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
  tint = 'order',
}: {
  label: string;
  onPress: () => void;
  tone?: Tone;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
  /** With tone "tinted": the stage colour, e.g. "info" for "Mark ready" (STATUS_TONES). */
  tint?: StatusTone;
}) {
  const theme = useTheme();
  const off = disabled || loading;
  const status = STATUS_TONES[theme.scheme][tint];
  const filled = tone === 'primary' || tone === 'destructive';
  // A red button's label is the page colour: white in light mode, near-black on the lighter
  // dark-mode red. Never the venue's on-accent colour, which is dark for a yellow venue.
  // palette.test.ts checks error against bg at 4.5:1 in both schemes.
  const destructiveInk = theme.white;
  const ink =
    off && filled
      ? theme.meta
      : tone === 'destructive'
        ? destructiveInk
        : filled
          ? theme.onFill
          : tone === 'tinted'
            ? status.ink
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
        // The owner app's buttons are pills, 48 px tall, with a light grey edge when secondary.
        theme.pill && {
          minHeight: tokens.owner.controls.height,
          borderRadius: tokens.radius.full,
          paddingHorizontal: tokens.space[5],
        },
        tone === 'primary' && { backgroundColor: pressed ? theme.pressed : theme.fill },
        tone === 'destructive' && { backgroundColor: theme.error, opacity: pressed ? 0.85 : 1 },
        tone === 'secondary' && {
          backgroundColor: pressed ? theme.wash : theme.surface,
          borderWidth: theme.pill ? 1 : 1.5,
          borderColor: theme.pill ? theme.line : theme.black,
        },
        tone === 'tinted' && { backgroundColor: status.bg, opacity: pressed ? 0.8 : 1 },
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
