import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Megaphone } from 'lucide-react-native';
import type { StoreNotice } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useReducedMotion } from '@/ui/useReducedMotion.web';

// Reading pace for scrolling text, in points per second (same as the phone version).
const SPEED = 40;

/**
 * The web version of StoreNoticeBanner (see StoreNoticeBanner.tsx): the same scroll at the same
 * speed, without Reanimated, which keeps Reanimated off the guest home page.
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
  const moves = !reduceMotion && boxWidth > 0 && textWidth > boxWidth;
  // On the web a View's ref is its DOM element, so the scroll moves it directly each frame.
  // (React Native Web drops CSS keyframes given as an inline style.)
  const row = useRef<ComponentRef<typeof View>>(null);

  useEffect(() => {
    const el = row.current as unknown as HTMLElement | null;
    if (!el) return;
    if (!moves) {
      el.style.transform = '';
      return;
    }
    const lap = boxWidth + textWidth;
    const start = performance.now();
    let frame = requestAnimationFrame(function step(now) {
      // Enters from the right edge, leaves past the left, then starts again.
      const x = boxWidth - ((((now - start) / 1000) * SPEED) % lap);
      el.style.transform = `translateX(${x}px)`;
      frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [moves, boxWidth, textWidth]);

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
          <View ref={row} style={styles.row}>
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
          </View>
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
  text: { fontFamily: 'Inter_600' },
});
