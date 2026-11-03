import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

export type Bar = { label: string; value: number };

/**
 * Vertical bars, one series. Only the selected bar (the tallest at first) is labelled, so the chart
 * stays quiet; tap or hover any bar to read it. Screen readers get one sentence with every value.
 */
export function BarChart({
  bars,
  format = String,
  summary,
  height = 140,
}: {
  bars: Bar[];
  format?: (value: number) => string;
  /** Spoken before the values, e.g. "Sales per day". */
  summary: string;
  height?: number;
}) {
  const theme = useTheme();
  const c = {
    // White bars with a fine edge: clear on the grey Today panel and on white cards alike.
    bar: theme.surface,
    edge: theme.line,
    active: theme.fill,
    text: theme.text,
    muted: theme.muted,
    guide: theme.line,
  };
  const max = Math.max(0, ...bars.map((b) => b.value));
  const peak = bars.findIndex((b) => b.value === max);
  const [picked, setPicked] = useState<number | null>(null);
  const active = picked ?? peak;
  const current = bars[active];
  // Thin the axis labels when there are many bars, so they never collide.
  const every = bars.length > 8 ? Math.ceil(bars.length / 7) : 1;
  const spoken = `${summary}. ${bars.map((b) => `${b.label}: ${format(b.value)}`).join(', ')}`;

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={spoken} style={styles.wrap}>
      <View style={styles.readout}>
        <Text variant="caption" style={{ color: c.muted }}>
          {current?.label ?? ''}
        </Text>
        <Text variant="title" style={[styles.num, { color: c.text }]}>
          {current ? format(current.value) : ''}
        </Text>
      </View>
      <View style={[styles.plot, { height }]}>
        {/* Recessive guides at half and full height. */}
        <View style={[styles.guide, { top: 0, backgroundColor: c.guide }]} />
        <View style={[styles.guide, { top: height / 2, backgroundColor: c.guide }]} />
        {bars.map((bar, index) => {
          const h =
            max === 0 || bar.value === 0
              ? 0
              : Math.max(4, Math.round((bar.value / max) * (height - 4)));
          const on = index === active;
          return (
            <Pressable
              key={`${bar.label}-${index}`}
              onPress={() => setPicked(index)}
              onHoverIn={() => setPicked(index)}
              importantForAccessibility="no"
              style={styles.col}
            >
              <View
                style={[
                  styles.bar,
                  {
                    height: h,
                    backgroundColor: on ? c.active : c.bar,
                    borderColor: on ? c.active : c.edge,
                    borderWidth: StyleSheet.hairlineWidth,
                  },
                ]}
              />
            </Pressable>
          );
        })}
      </View>
      <View style={[styles.axis, { borderTopColor: c.guide }]}>
        {bars.map((bar, index) => (
          <Text
            key={`${bar.label}-${index}`}
            variant="caption"
            numberOfLines={1}
            style={[styles.tick, { color: index === active ? c.text : c.muted }]}
          >
            {index % every === 0 ? bar.label : ''}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.space[2] },
  readout: { gap: 0 },
  num: { fontVariant: ['tabular-nums'] },
  plot: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  guide: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth },
  col: { flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  bar: { width: '78%', maxWidth: 36, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  axis: { flexDirection: 'row', gap: 2, borderTopWidth: 1, paddingTop: tokens.space[1] },
  tick: { flex: 1, textAlign: 'center', fontSize: 11 },
});
