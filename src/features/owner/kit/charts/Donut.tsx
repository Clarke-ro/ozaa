import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';

export type DonutPart = { value: number; color: string };

/**
 * A ring split into coloured parts (design canvas: share of order value, returning guests), with a
 * figure and a small caption in the middle. Parts run clockwise from twelve o'clock.
 */
export function Donut({
  parts,
  size,
  stroke,
  figure,
  caption,
  label,
}: {
  parts: readonly DonutPart[];
  size: number;
  stroke: number;
  figure: string;
  caption: string;
  /** What the ring shows, read by screen readers. */
  label: string;
}) {
  const theme = useTheme();
  const radius = (size - stroke) / 2;
  const around = 2 * Math.PI * radius;
  const total = parts.reduce((sum, p) => sum + p.value, 0);
  let start = 0;
  return (
    <View style={{ width: size, height: size }} accessible accessibilityLabel={label}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.wash}
          strokeWidth={stroke}
          fill="none"
        />
        {total > 0
          ? parts.map((p, i) => {
              const length = (p.value / total) * around;
              const arc = (
                <Circle
                  key={i}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke={p.color}
                  strokeWidth={stroke}
                  fill="none"
                  strokeDasharray={`${length} ${around}`}
                  strokeDashoffset={-start}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
              );
              start += length;
              return arc;
            })
          : null}
      </Svg>
      <View style={styles.centre}>
        <Text style={styles.figure}>{figure}</Text>
        <Text style={[styles.caption, { color: theme.meta }]}>{caption}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centre: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  figure: { fontSize: 20, lineHeight: 26, fontFamily: fontFamily.strong },
  caption: { fontSize: 12, lineHeight: 16 },
});
