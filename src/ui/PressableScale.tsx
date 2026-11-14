import { useState } from 'react';
import {
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type PressableStateCallbackType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { tokens } from '@/theme/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const m = tokens.motion;

type Props = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle> | ((state: PressableStateCallbackType) => StyleProp<ViewStyle>);
  /** How far it shrinks under the finger. Cards 0.97 (default); small targets like tabs a bit more. */
  scale?: number;
};

/**
 * A Pressable that gives way under the finger, the way iOS buttons and cards do.
 *
 * - It shrinks on touch-down, not on release, so the feedback is instant (apple-motion §1).
 * - It springs back from wherever it is, so a quick tap or a cancelled press never jumps (§3).
 * - With Reduce Motion on, nothing moves; the colour change in `style` still shows the press.
 */
export function PressableScale({
  style,
  scale = m.pressScale,
  onPressIn,
  onPressOut,
  onHoverIn,
  onHoverOut,
  disabled,
  ...rest
}: Props) {
  const reduce = useReducedMotion();
  const size = useSharedValue(1);
  // Style callbacks ("pressed ? wash : surface") still need the pressed flag, so keep it here too.
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: size.get() }] }));

  const down = (e: GestureResponderEvent) => {
    setPressed(true);
    if (!reduce && !disabled) size.set(withTiming(scale, { duration: m.press }));
    onPressIn?.(e);
  };
  const up = (e: GestureResponderEvent) => {
    setPressed(false);
    if (!reduce) size.set(withSpring(1, m.spring));
    onPressOut?.(e);
  };
  const resolved = typeof style === 'function' ? style({ pressed, hovered }) : style;

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={down}
      onPressOut={up}
      onHoverIn={(e) => {
        setHovered(true);
        onHoverIn?.(e);
      }}
      onHoverOut={(e) => {
        setHovered(false);
        onHoverOut?.(e);
      }}
      style={[resolved, animated]}
    />
  );
}
