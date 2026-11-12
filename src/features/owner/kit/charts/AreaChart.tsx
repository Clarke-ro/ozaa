import { useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

export type Point = { label: string; value: number };

// Two gaps means three lines: zero, half and the top.
const GRID = 2;
const DOT = tokens.space[1] + 1;
// Room for the grid labels ("GH₵3.3k") on the left, and for the end dot on the right.
const AXIS = tokens.space[16] + tokens.space[2];
const END = DOT + tokens.space[1];

/**
 * A round number just above `max` whose half is round too, so the middle grid line reads
 * "GH₵1k" and never "GH₵666.67".
 */
function niceTop(max: number): number {
  if (max <= 0) return 1;
  const step = 10 ** Math.floor(Math.log10(max));
  for (const m of [1, 2, 4, 6, 8, 10]) if (m * step >= max) return m * step;
  return 10 * step;
}

/**
 * A line with a soft fill under it, for money or counts over days. Three light grid lines carry
 * short labels on the left; the first, middle and last days are named underneath. Tap a column
 * to read that day; the latest day is shown until then. Screen readers get one sentence with
 * every value.
 */
export function AreaChart({
  points,
  format = String,
  axis = format,
  summary,
  height = 180,
}: {
  points: Point[];
  format?: (value: number) => string;
  /** Shorter labels for the grid lines, e.g. "GH₵2k". */
  axis?: (value: number) => string;
  summary: string;
  height?: number;
}) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const n = points.length;
  const top = niceTop(Math.max(0, ...points.map((p) => p.value)));
  const plot = Math.max(0, width - AXIS - END);
  const x = (i: number) => AXIS + (n <= 1 ? plot / 2 : (i / (n - 1)) * plot);
  const y = (v: number) => tokens.space[2] + (1 - v / top) * (height - tokens.space[4]);
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p.value)}`).join(' ');
  const area = n ? `${line} L${x(n - 1)},${y(0)} L${x(0)},${y(0)} Z` : '';
  const active = picked ?? n - 1;
  const current = points[active];
  const ticks = [0, Math.floor((n - 1) / 2), n - 1].filter(
    (v, i, a) => v >= 0 && a.indexOf(v) === i,
  );
  const spoken = `${summary}. ${points.map((p) => `${p.label}: ${format(p.value)}`).join(', ')}`;

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={spoken} style={styles.wrap}>
      {current ? (
        <View style={styles.readout}>
          <Text variant="caption" style={{ color: theme.muted }}>
            {current.label}
          </Text>
          <Text variant="body-strong" style={styles.num}>
            {format(current.value)}
          </Text>
        </View>
      ) : null}
      <View
        style={{ height }}
        onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      >
        {width > 0 ? (
          <Svg width={width} height={height}>
            {Array.from({ length: GRID + 1 }, (_, g) => {
              const gy = y((top * g) / GRID);
              return (
                <Line
                  key={g}
                  x1={AXIS}
                  x2={width - END}
                  y1={gy}
                  y2={gy}
                  stroke={theme.line}
                  strokeWidth={StyleSheet.hairlineWidth}
                />
              );
            })}
            <Path d={area} fill={theme.fill} fillOpacity={0.12} />
            <Path d={line} stroke={theme.fill} strokeWidth={2} fill="none" strokeLinejoin="round" />
            {current ? (
              <>
                <Line
                  x1={x(active)}
                  x2={x(active)}
                  y1={y(top)}
                  y2={y(0)}
                  stroke={theme.meta}
                  strokeWidth={StyleSheet.hairlineWidth}
                  strokeDasharray="3,3"
                />
                <Circle
                  cx={x(active)}
                  cy={y(current.value)}
                  r={DOT}
                  fill={theme.surface}
                  stroke={theme.fill}
                  strokeWidth={2}
                />
              </>
            ) : null}
          </Svg>
        ) : null}
        {Array.from({ length: GRID + 1 }, (_, g) => (
          <Text
            key={g}
            variant="caption"
            numberOfLines={1}
            style={[styles.axis, { top: y((top * g) / GRID) - 8, color: theme.meta }]}
          >
            {axis((top * g) / GRID)}
          </Text>
        ))}
        {/* One invisible column per day, so a tap anywhere near a day picks it. */}
        <View style={[StyleSheet.absoluteFill, styles.hits, { left: AXIS, right: END }]}>
          {points.map((p, i) => (
            <Pressable
              key={`${p.label}-${i}`}
              onPress={() => setPicked(i)}
              onHoverIn={() => setPicked(i)}
              style={styles.hit}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          ))}
        </View>
      </View>
      <View style={[styles.labels, { marginLeft: AXIS, marginRight: END }]}>
        {ticks.map((i) => (
          <Text key={i} variant="caption" style={{ color: theme.meta }} numberOfLines={1}>
            {points[i]?.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.space[2] },
  readout: { gap: 2 },
  num: { fontVariant: ['tabular-nums'] },
  axis: { position: 'absolute', left: 0, width: AXIS - tokens.space[2], textAlign: 'right' },
  hits: { flexDirection: 'row' },
  hit: { flex: 1 },
  labels: { flexDirection: 'row', justifyContent: 'space-between' },
});
