import { StyleSheet, View } from 'react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';

export type RankRow = { label: string; value: string; detail?: string };

/**
 * A ranked list as a plain two-column table: small capital headings ("DISH", "SOLD"), then one
 * ruled row per entry with the name on the left and its figure on the right. Rows come in rank
 * order; the table does not sort.
 */
export function RankTable({
  nameHead,
  valueHead,
  rows,
}: {
  nameHead: string;
  valueHead: string;
  rows: RankRow[];
}) {
  const theme = useTheme();
  return (
    <View>
      <View style={[styles.row, styles.head, { borderBottomColor: theme.line }]}>
        <Text variant="caption" style={[styles.caps, styles.name, { color: theme.meta }]}>
          {nameHead.toUpperCase()}
        </Text>
        <Text variant="caption" style={[styles.caps, { color: theme.meta }]}>
          {valueHead.toUpperCase()}
        </Text>
      </View>
      {rows.map((row, index) => (
        <View
          key={`${row.label}-${index}`}
          style={[
            styles.row,
            index > 0 && { borderTopColor: theme.line, borderTopWidth: StyleSheet.hairlineWidth },
          ]}
        >
          <View style={styles.name}>
            <Text variant="body" numberOfLines={1}>
              {row.label}
            </Text>
            {row.detail ? (
              <Text variant="caption" style={{ color: theme.muted }}>
                {row.detail}
              </Text>
            ) : null}
          </View>
          <Text variant="body-strong" style={styles.num}>
            {row.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    minHeight: tokens.touchTarget,
    paddingVertical: tokens.space[1],
  },
  head: { minHeight: tokens.space[8], borderBottomWidth: StyleSheet.hairlineWidth },
  caps: { fontFamily: fontFamily.strong, letterSpacing: tokens.owner.type.caps.letterSpacing },
  name: { flex: 1, minWidth: 0 },
  num: { fontVariant: ['tabular-nums'] },
});
