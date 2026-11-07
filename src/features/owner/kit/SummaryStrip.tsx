import { Fragment } from 'react';
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

/** A few numbers in one box, split by thin lines, read left to right. */
export function SummaryStrip({ items }: { items: readonly SummaryItem[] }) {
  const theme = useTheme();
  return (
    <View style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.line }]}>
      {items.map((item, index) => (
        <Fragment key={item.label}>
          {index > 0 ? <View style={[styles.rule, { backgroundColor: theme.line }]} /> : null}
          <View accessible accessibilityLabel={`${item.label}: ${item.value}`} style={styles.tile}>
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
        </Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
  },
  rule: { width: StyleSheet.hairlineWidth },
  tile: {
    flex: 1,
    gap: 2,
    paddingVertical: tokens.space[3],
    paddingHorizontal: tokens.space[4],
  },
  value: { fontVariant: ['tabular-nums'] },
});
