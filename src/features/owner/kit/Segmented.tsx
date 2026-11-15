import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { hapticSelection } from '@/lib/haptics';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { SHADOW_INK } from '@/theme/palette';
import { useOwnerLayout } from '../chrome/layout';

type Frame = { x: number; width: number };

/** iOS-style segmented control for a few mutually exclusive choices (date ranges, filters). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  equal,
}: {
  options: readonly { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  /** What the choice is about, read by screen readers. */
  label: string;
  /** Every option the same width (canvas, on full-width controls). Small controls size to their words. */
  equal?: boolean;
}) {
  const theme = useTheme();
  // Phones: a third of a ~300 px track is about 95 px, too short for "As you arrange" on one
  // line, so labels may take two lines there and the side padding tightens.
  const { wide } = useOwnerLayout();
  const reduce = useReducedMotion();
  // Where each option sits in the track, measured once laid out, so the white pill can slide
  // to the picked one instead of jumping (apple-motion §7: it moves along the path you see).
  const [frames, setFrames] = useState<Record<string, Frame>>({});
  const picked = frames[value];
  const x = useSharedValue(0);
  const w = useSharedValue(0);
  useEffect(() => {
    if (!picked) return;
    // The first placement and Reduce Motion snap; later choices slide.
    const snap = reduce || w.get() === 0;
    const go = (to: number) => (snap ? to : withTiming(to, { duration: tokens.motion.toggle }));
    x.set(go(picked.x));
    w.set(go(picked.width));
  }, [picked, reduce, x, w]);
  const pill = useAnimatedStyle(() => ({ left: x.get(), width: w.get() }));
  const measure = (id: T) => (e: LayoutChangeEvent) => {
    const { x: left, width } = e.nativeEvent.layout;
    setFrames((all) =>
      all[id]?.x === left && all[id]?.width === width ? all : { ...all, [id]: { x: left, width } },
    );
  };
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={[styles.track, { backgroundColor: theme.track }]}
    >
      {picked ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.pill, styles.on, { backgroundColor: theme.surface }, pill]}
        />
      ) : null}
      {options.map((option) => {
        const on = option.id === value;
        return (
          <Pressable
            key={option.id}
            onLayout={measure(option.id)}
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
              !wide && styles.phone,
              equal && styles.equal,
              // Until the track is measured, the picked option draws its own pill.
              on && !picked && [styles.on, { backgroundColor: theme.surface }],
            ]}
          >
            <Text
              // Phones: a long label wraps to two centred lines instead of losing its end.
              numberOfLines={wide ? 1 : 2}
              style={{
                fontSize: 14,
                lineHeight: 20,
                textAlign: 'center',
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
  // Canvas switch: a warm grey track, 3 px inset, a 38 px white pill on the picked option.
  // A two-line phone label makes the track taller; a fixed 22 px radius (half the one-line
  // height) keeps the same corners instead of turning into a long oval.
  track: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 22,
  },
  segment: {
    // Grow to share a wide track, but never squeeze a label narrower than its text.
    flexGrow: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tokens.space[4],
    borderRadius: tokens.radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  equal: { flexBasis: 0 },
  // The sliding white pill: the same 3 px inset as the track, full height of the options.
  pill: { position: 'absolute', top: 3, bottom: 3, borderRadius: tokens.radius.full },
  // Still shrinks if the words together are wider than the track; the label then wraps.
  // 40 px tall on a phone, a touch taller than the canvas's 38, so it isn't a thin strip.
  phone: { paddingHorizontal: tokens.space[2], flexShrink: 1, minWidth: 0, minHeight: 40 },
  on: {
    shadowColor: SHADOW_INK,
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
});
