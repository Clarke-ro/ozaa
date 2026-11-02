import { StyleSheet, View } from 'react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

export type Bar = { label: string; value: number };

/**
 * Simple vertical bars with the value printed on each one, so the chart never relies on
 * bar height (or colour) alone. Screen readers get one sentence listing every bar.
 */
export function BarChart({
  bars,
  format = String,
  summary,
  height = 120,
  highlightMax = false,
}: {
  bars: Bar[];
  format?: (value: number) => string;
  /** Spoken before the values, e.g. "Sales per day". */
  summary: string;
  height?: number;
  /** Fill the tallest bar with the accent and the rest in grey. */
  highlightMax?: boolean;
}) {
  const theme = useTheme();
  const max = Math.max(0, ...bars.map((bar) => bar.value));
  const spoken = `${summary}. ${bars.map((bar) => `${bar.label}: ${format(bar.value)}`).join(', ')}`;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={spoken} style={styles.row}>
      {bars.map((bar, index) => {
        // A zero day stays a zero-height bar; only a real value gets the 4 px minimum so it shows.
        const h =
          max === 0 || bar.value === 0 ? 0 : Math.max(4, Math.round((bar.value / max) * height));
        const top = highlightMax && bar.value === max && max > 0;
        return (
          <View key={`${bar.label}-${index}`} style={styles.col}>
            <Text
              variant="caption"
              numberOfLines={1}
              adjustsFontSizeToFit
              style={[styles.value, { color: theme.muted }]}
            >
              {format(bar.value)}
            </Text>
            <View style={[styles.track, { height, borderBottomColor: theme.line }]}>
              <View
                style={[
                  styles.fill,
                  { height: h, backgroundColor: !highlightMax || top ? theme.fill : theme.line },
                ]}
              />
            </View>
            <Text variant="caption" numberOfLines={1} style={{ color: theme.muted }}>
              {bar.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: tokens.space[2] },
  col: { flex: 1, alignItems: 'center', gap: tokens.space[1], minWidth: 0 },
  value: { fontVariant: ['tabular-nums'] },
  track: {
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  fill: {
    width: '70%',
    maxWidth: 32,
    borderTopLeftRadius: tokens.radius.sm,
    borderTopRightRadius: tokens.radius.sm,
  },
});
