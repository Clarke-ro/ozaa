import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

export type TableRow = { label: string; value: string };

/**
 * One chart in its own card: title, an optional headline figure, the chart, and a
 * "Show numbers" switch that swaps the chart for a plain list (for screen readers and exact values).
 */
export function ChartCard({
  title,
  figure,
  caption,
  rows,
  empty,
  children,
}: {
  title: string;
  /** The headline number, e.g. total sales for the period. */
  figure?: string;
  caption?: string;
  /** The same data as a list. Omit when the card is not a chart. */
  rows?: TableRow[];
  /** Shown instead of the chart when there is nothing to plot. */
  empty?: string;
  children?: ReactNode;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [table, setTable] = useState(false);
  const hasData = !empty;
  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
      <View style={styles.head}>
        <View style={styles.flex}>
          <Text variant="body-strong" accessibilityRole="header" style={{ color: theme.muted }}>
            {title}
          </Text>
          {figure ? (
            <Text variant="display-m" style={styles.figure}>
              {figure}
            </Text>
          ) : null}
          {caption ? (
            <Text variant="caption" style={{ color: theme.muted }}>
              {caption}
            </Text>
          ) : null}
        </View>
        {rows && hasData ? (
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: table }}
            accessibilityLabel={t('ownerCharts.showNumbers')}
            onPress={() => setTable((on) => !on)}
            hitSlop={8}
            style={({ pressed }) => [
              styles.toggle,
              {
                borderColor: theme.line,
                backgroundColor: table || pressed ? theme.wash : theme.surface,
              },
            ]}
          >
            <Text variant="caption" style={{ fontFamily: 'Inter_600' }}>
              {table ? t('ownerCharts.showChart') : t('ownerCharts.showNumbers')}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {!hasData ? (
        <Text variant="body" style={{ color: theme.muted }}>
          {empty}
        </Text>
      ) : table && rows ? (
        <View>
          {rows.map((row, index) => (
            <View
              key={`${row.label}-${index}`}
              style={[
                styles.tableRow,
                index > 0 && {
                  borderTopColor: theme.line,
                  borderTopWidth: StyleSheet.hairlineWidth,
                },
              ]}
            >
              <Text variant="body" style={styles.flex}>
                {row.label}
              </Text>
              <Text variant="body-strong" style={styles.num}>
                {row.value}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        children
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: tokens.space[4],
    padding: tokens.space[4],
    boxShadow: tokens.shadow.card,
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
  },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: tokens.space[3] },
  flex: { flex: 1 },
  figure: { fontVariant: ['tabular-nums'], marginTop: 2 },
  toggle: {
    minHeight: 32,
    paddingHorizontal: tokens.space[3],
    borderWidth: 1,
    borderRadius: tokens.radius.full,
    justifyContent: 'center',
  },
  tableRow: { flexDirection: 'row', alignItems: 'center', minHeight: 40, gap: tokens.space[3] },
  num: { fontVariant: ['tabular-nums'] },
});
