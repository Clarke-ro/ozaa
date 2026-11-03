import { StyleSheet, View } from 'react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

/** "13:00" style label for an hour of the day. */
export function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

/**
 * Orders across the opening hours as short columns, one hue getting stronger with volume.
 * Only the hours that appear in the data are drawn, so a café open 7–15 is not mostly empty.
 */
export function HourStrip({
  hours,
  summary,
}: {
  hours: { hour: number; orders: number }[];
  summary: string;
}) {
  const theme = useTheme();
  const sorted = [...hours].sort((a, b) => a.hour - b.hour);
  const max = Math.max(1, ...sorted.map((h) => h.orders));
  const spoken = `${summary}. ${sorted.map((h) => `${hourLabel(h.hour)}: ${h.orders}`).join(', ')}`;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={spoken} style={styles.wrap}>
      <View style={styles.plot}>
        {sorted.map((h) => {
          const share = h.orders / max;
          return (
            <View key={h.hour} style={styles.col}>
              <View
                style={[
                  styles.bar,
                  {
                    height: Math.max(4, Math.round(share * 64)),
                    backgroundColor: theme.fill,
                    // Sequential: one hue, quieter for slow hours.
                    opacity: 0.25 + share * 0.75,
                  },
                ]}
              />
            </View>
          );
        })}
      </View>
      <View style={styles.axis}>
        <Text variant="caption" style={{ color: theme.muted }}>
          {sorted[0] ? hourLabel(sorted[0].hour) : ''}
        </Text>
        <Text variant="caption" style={{ color: theme.muted }}>
          {sorted.at(-1) ? hourLabel(sorted.at(-1)!.hour) : ''}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.space[1] },
  plot: { flexDirection: 'row', alignItems: 'flex-end', height: 64, gap: 2 },
  col: { flex: 1, justifyContent: 'flex-end' },
  bar: { borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  axis: { flexDirection: 'row', justifyContent: 'space-between' },
});
