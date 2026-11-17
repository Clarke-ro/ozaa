import { useLayoutEffect, useRef, useState, type ComponentProps, type ComponentRef } from 'react';
import { Platform, StyleSheet, type Text as NativeText } from 'react-native';
import { fitFontSize } from './fitText';
import { Text } from './Text';

type Props = ComponentProps<typeof Text>;

// On phones adjustsFontSizeToFit stops at this share of the size; low enough that every word fits.
const NATIVE_MIN_SCALE = 0.3;

/**
 * One line of text that shrinks to fit its box instead of wrapping or ending in "…": stat
 * labels such as "Pending orders" and big numbers in narrow phone tiles. Every word always
 * shows (Clarke, 2026-11-17).
 * Phones use React Native's own adjustsFontSizeToFit. Browsers ignore that prop, so on the web
 * this measures the words against their box and sets a smaller size itself.
 */
export function FitText({ style, children, ...rest }: Props) {
  const flat = StyleSheet.flatten(style) ?? {};
  const base = typeof flat.fontSize === 'number' ? flat.fontSize : 14;
  // A size belongs to the words (and full size) it was measured for; new words start again at
  // full size without an extra render.
  const words = typeof children === 'string' || typeof children === 'number' ? children : null;
  const key = `${words}|${base}`;
  const [fit, setFit] = useState({ key, size: base });
  const size = fit.key === key ? fit.size : base;
  const setSize = (next: number) => setFit({ key, size: next });
  const box = useRef<ComponentRef<typeof NativeText>>(null);
  const width = useRef(0);

  const measure = () => {
    if (Platform.OS !== 'web') return;
    const el = box.current as unknown as HTMLElement | null;
    if (!el?.clientWidth) return;
    // The exact width of the words (scrollWidth rounds to whole pixels, so 105.4 px of text in a
    // 105 px box looked like it fit and still got "…").
    const range = document.createRange();
    range.selectNodeContents(el);
    const drawn = range.getBoundingClientRect().width;
    const room = el.getBoundingClientRect().width;
    // Only step down while the words overflow, sized from the current size. Fixed letter spacing
    // doesn't shrink with the font, so this can take a second step, and then it stops.
    if (drawn > room) setSize(fitFontSize({ size, natural: drawn, available: room }));
  };
  // Measure again after each size change.
  useLayoutEffect(measure);

  const lineHeight =
    typeof flat.lineHeight === 'number' ? (flat.lineHeight * size) / base : undefined;
  return (
    <Text
      {...rest}
      ref={box}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={NATIVE_MIN_SCALE}
      onLayout={(event) => {
        // A wider box (phone turned, window resized) starts again from the full size.
        const next = event.nativeEvent.layout.width;
        if (width.current && next > width.current && size !== base) setSize(base);
        width.current = next;
        // A box can have no width on the first draw; measure again once it has one.
        measure();
        rest.onLayout?.(event);
      }}
      style={[style, Platform.OS === 'web' && { fontSize: size, lineHeight }]}
    >
      {children}
    </Text>
  );
}
