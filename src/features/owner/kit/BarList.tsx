import { Fragment, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';

export type BarRow = {
  key: string;
  label: string;
  /** Grey text after the label, e.g. "· 9 orders". */
  sub?: string;
  value: string;
  /** 0 to 100. */
  share: number;
  /** Something on the left, e.g. initials. */
  lead?: ReactNode;
  color?: string;
};

/**
 * Rows of label, figure and a thin bar under them, split by light lines (canvas Payments, Where
 * orders came from, Order status, By staff member, Guest mood). Bars sit on a pale brand track.
 */
export function BarList({ rows }: { rows: readonly BarRow[] }) {
  const theme = useTheme();
  return (
    <>
      {rows.map((row, i) => (
        <Fragment key={row.key}>
          <View
            style={[styles.row, i > 0 && { borderTopWidth: 1, borderTopColor: theme.wash }]}
            accessible
            accessibilityLabel={`${row.label}${row.sub ? ` ${row.sub}` : ''}: ${row.value}`}
          >
            {row.lead}
            <View style={styles.body}>
              <View style={styles.top}>
                <Text style={styles.label} numberOfLines={1}>
                  {row.label}
                  {row.sub ? <Text style={{ color: theme.meta }}>{` ${row.sub}`}</Text> : null}
                </Text>
                <Text style={[styles.value, { color: theme.muted }]}>{row.value}</Text>
              </View>
              <View style={[styles.track, { backgroundColor: theme.tint }]}>
                <View
                  style={[
                    styles.fill,
                    {
                      backgroundColor: row.color ?? theme.fill,
                      width: `${Math.min(100, row.share)}%`,
                    },
                  ]}
                />
              </View>
            </View>
          </View>
        </Fragment>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  body: { flex: 1, minWidth: 0, gap: tokens.space[2] },
  top: { flexDirection: 'row', alignItems: 'baseline', gap: tokens.space[2] },
  label: { flex: 1, fontSize: 15, lineHeight: 20 },
  value: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: fontFamily.strong,
    fontVariant: ['tabular-nums'],
  },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
});
