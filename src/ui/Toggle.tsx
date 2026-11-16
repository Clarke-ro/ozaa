import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { hapticImpactLight } from '@/lib/haptics';
import { tokens } from '@/theme/tokens';
import { useTheme } from '@/ui/theme';

const WIDTH = 52;
const KNOB = 24;
const PAD = 3;
// How far the knob travels: the track minus the knob and the padding on both sides.
const TRAVEL = WIDTH - KNOB - PAD * 2;

/**
 * On/off switch for guest and owner screens, drawn to match owner-services.png (orange track, white knob). The knob slides and
 * the track colour fades in the same 180 ms as the tap's haptic, so sight and touch agree
 * (apple-motion §13). With Reduce Motion on, it changes at once.
 */
export function Toggle({
  value,
  onChange,
  label,
  disabled,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const reduce = useReducedMotion();
  const on = useSharedValue(value ? 1 : 0);

  // Follows `value`, so a switch flipped by a save or a reset also moves, not only a tap.
  useEffect(() => {
    const target = value ? 1 : 0;
    on.set(reduce ? target : withTiming(target, { duration: tokens.motion.toggle }));
  }, [value, reduce, on]);

  const off = theme.line;
  const fill = theme.fill;
  const track = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(on.get(), [0, 1], [off, fill]),
  }));
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: on.get() * TRAVEL }] }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      aria-checked={value}
      aria-disabled={disabled}
      disabled={disabled}
      hitSlop={8}
      onPress={() => {
        void hapticImpactLight();
        onChange(!value);
      }}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <Animated.View style={[styles.track, track]}>
        <Animated.View style={[styles.knob, { backgroundColor: theme.onFill }, knob]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: WIDTH,
    height: KNOB + PAD * 2,
    borderRadius: (KNOB + PAD * 2) / 2,
    padding: PAD,
    justifyContent: 'center',
  },
  knob: { width: KNOB, height: KNOB, borderRadius: KNOB / 2 },
});
