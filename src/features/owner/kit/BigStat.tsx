import { StyleSheet, View } from 'react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

/** "Today's sales / GH₵2,480 / +12% vs last Saturday" headline (Unbounded big number). */
export function BigStat({
  label,
  value,
  delta,
  deltaTone,
  note,
}: {
  label: string;
  value: string;
  delta?: string;
  deltaTone?: 'up' | 'down' | 'flat';
  note?: string;
}) {
  const theme = useTheme();
  const deltaColor = deltaTone === 'up' ? theme.success : deltaTone === 'down' ? theme.error : theme.muted;
  return (
    <View style={styles.wrap}>
      <Text variant="body" style={{ color: theme.muted }}>
        {label}
      </Text>
      <Text
        variant="display-l"
        style={[styles.big, { fontVariant: ['tabular-nums'] }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        accessibilityRole="header"
      >
        {value}
      </Text>
      {delta || note ? (
        <View style={styles.row}>
          {delta ? (
            <Text variant="body-strong" style={{ color: deltaColor }}>
              {delta}
            </Text>
          ) : null}
          {note ? (
            <Text variant="body" style={{ color: theme.muted }}>
              {note}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.space[1] },
  big: { fontSize: 40, lineHeight: 48 },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2], flexWrap: 'wrap' },
});
