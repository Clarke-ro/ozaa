import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Megaphone } from 'lucide-react-native';
import type { StoreNotice } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { guestFont, useTheme } from '@/ui/theme';

// Reading pace for scrolling text, in points per second. Slow enough to read on a cheap phone.
const SPEED = 40;

/**
 * The venue's scrolling banner. Text that fits stays still; longer text scrolls right to left.
 * With Reduce Motion on, it never moves and wraps onto two lines instead. Screen readers hear the
 * whole message once, not the moving copy.
 */
export function StoreNoticeBanner({
  notice,
  topInset = 0,
}: {
  notice: StoreNotice;
  topInset?: number;
}) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const [boxWidth, setBoxWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const x = useSharedValue(0);
  const moves = !reduceMotion && boxWidth > 0 && textWidth > boxWidth;

  useEffect(() => {
    if (!moves) {
      cancelAnimation(x);
      x.value = 0;
      return;
    }
    x.value = boxWidth;
    x.value = withRepeat(
      withTiming(-textWidth, {
        duration: ((boxWidth + textWidth) / SPEED) * 1000,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
    return () => cancelAnimation(x);
  }, [moves, boxWidth, textWidth, x]);

  const slide = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={notice.text}
      style={[styles.bar, { backgroundColor: theme.tint, paddingTop: topInset + tokens.space[2] }]}
    >
      <Megaphone size={16} color={theme.badgeInk} />
      <View
        style={styles.track}
        onLayout={(event) => setBoxWidth(event.nativeEvent.layout.width)}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        {reduceMotion ? (
          <Text
            variant="caption"
            numberOfLines={2}
            style={[styles.text, { color: theme.badgeInk }]}
          >
            {notice.text}
          </Text>
        ) : (
          <Animated.View style={[styles.row, slide]}>
            {/* A very wide box so the text keeps to one line and we can measure its real width. */}
            <View style={styles.measure}>
              <Text
                variant="caption"
                numberOfLines={1}
                onLayout={(event) => setTextWidth(event.nativeEvent.layout.width)}
                style={[styles.text, { color: theme.badgeInk }]}
              >
                {notice.text}
              </Text>
            </View>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    paddingHorizontal: tokens.space[4],
    paddingBottom: tokens.space[2],
  },
  track: { flex: 1, overflow: 'hidden', minHeight: 20, justifyContent: 'center' },
  row: { flexDirection: 'row' },
  measure: { width: 4000, flexDirection: 'row' },
  text: { fontFamily: guestFont.strong },
});
