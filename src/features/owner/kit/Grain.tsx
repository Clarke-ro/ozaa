import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';

const TILE = 48;

// A fixed scatter of specks (seeded, so every render and every card gets the same texture).
const SPECKS = (() => {
  let seed = 7;
  const next = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  return Array.from({ length: 70 }, () => ({
    x: next() * TILE,
    y: next() * TILE,
    r: 0.35 + next() * 0.55,
    light: next() > 0.5,
  }));
})();

/** Fine paper-like grain laid over a coloured card. Decorative, so hidden from screen readers. */
export function Grain({ opacity = 0.18 }: { opacity?: number }) {
  const id = `grain-${useId().replace(/:/g, '')}`;
  return (
    // The wrapper hides it from screen readers; Svg itself passes unknown props to the DOM on web.
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg style={StyleSheet.absoluteFill}>
        <Defs>
          <Pattern id={id} patternUnits="userSpaceOnUse" width={TILE} height={TILE}>
            {SPECKS.map((s, i) => (
              <Circle key={i} cx={s.x} cy={s.y} r={s.r} fill={s.light ? '#FFFFFF' : '#000000'} />
            ))}
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} opacity={opacity} />
      </Svg>
    </View>
  );
}
