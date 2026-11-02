import { StyleSheet, View } from 'react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

export type SummaryItem = {
  label: string;
  value: string;
  /** `alert` turns the number red when something needs doing. */
  tone?: 'alert';
};

/** A row of equal white tiles, each one big number and a short label, read left to right. */
export function SummaryStrip({ items }: { items: readonly SummaryItem[] }) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      {items.map((item) => (
        <View
          key={item.label}
          accessible
          accessibilityLabel={`${item.label}: ${item.value}`}
          style={[styles.tile, { backgroundColor: theme.surface, borderColor: theme.line }]}
        >
          <Text
            variant="title"
            numberOfLines={1}
            style={[styles.value, { color: item.tone === 'alert' ? theme.error : theme.text }]}
          >
            {item.value}
          </Text>
          <Text variant="caption" numberOfLines={1} style={{ color: theme.muted }}>
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: tokens.space[2] },
  tile: {
    flex: 1,
    gap: 2,
    paddingVertical: tokens.space[3],
    paddingHorizontal: tokens.space[3],
    boxShadow: tokens.shadow.card,
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
  },
  value: { fontVariant: ['tabular-nums'] },
});
