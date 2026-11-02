import { StyleSheet, View } from 'react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

export type Ranked = { label: string; value: number; detail?: string };

/** A ranked list with a bar under each name, longest first. Good for top dishes. */
export function RankBars({
  items,
  format = String,
}: {
  items: Ranked[];
  format?: (value: number) => string;
}) {
  const theme = useTheme();
  // Always ranked by the plotted value, whatever order the data arrives in.
  const ranked = [...items].sort((a, b) => b.value - a.value);
  const max = Math.max(1, ...ranked.map((i) => i.value));
  return (
    <View style={styles.list}>
      {ranked.map((item, index) => (
        <View
          key={`${item.label}-${index}`}
          accessible
          accessibilityLabel={`${index + 1}. ${item.label}, ${format(item.value)}${item.detail ? `, ${item.detail}` : ''}`}
          style={styles.row}
        >
          <View style={styles.line}>
            <Text variant="caption" style={[styles.rank, { color: theme.muted }]}>
              {index + 1}
            </Text>
            <Text variant="body" numberOfLines={1} style={styles.flex}>
              {item.label}
            </Text>
            <Text variant="body-strong" style={styles.num}>
              {format(item.value)}
            </Text>
          </View>
          <View style={[styles.track, { backgroundColor: theme.wash }]}>
            <View
              style={[
                styles.fill,
                {
                  width: `${(item.value / max) * 100}%`,
                  backgroundColor: index === 0 ? theme.fill : theme.muted,
                },
              ]}
            />
          </View>
          {item.detail ? (
            <Text variant="caption" style={[styles.detail, { color: theme.muted }]}>
              {item.detail}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: tokens.space[3] },
  row: { gap: tokens.space[1] },
  line: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
  rank: { width: 16, fontVariant: ['tabular-nums'] },
  flex: { flex: 1 },
  num: { fontVariant: ['tabular-nums'] },
  track: { height: 8, borderRadius: 4, marginLeft: 24, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  detail: { marginLeft: 24 },
});
