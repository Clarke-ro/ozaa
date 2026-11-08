import { useState } from 'react';
import { Pressable, StyleSheet, View, type DimensionValue } from 'react-native';
import { CircleAlert, type LucideIcon } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

export type Metric = {
  key: string;
  label: string;
  value: string;
  note?: string;
  icon?: LucideIcon;
  /** Needs action now: red note with an alert icon, so it never rests on colour alone. */
  alert?: boolean;
  onPress?: () => void;
};

/**
 * Key numbers in one box, split by thin lines, like a till's end-of-day strip.
 * `columns` sets how many sit on a row; the rest wrap below with a line between rows.
 */
export function MetricStrip({ metrics, columns }: { metrics: Metric[]; columns: number }) {
  const theme = useTheme();
  const basis: DimensionValue = `${100 / columns}%`;
  return (
    <View style={[styles.strip, { backgroundColor: theme.surface, borderColor: theme.line }]}>
      {metrics.map((metric, index) => (
        <View
          key={metric.key}
          style={[
            { flexBasis: basis, maxWidth: basis, borderColor: theme.line },
            index % columns !== 0 && styles.leftEdge,
            index >= columns && styles.topEdge,
          ]}
        >
          <MetricCell metric={metric} />
        </View>
      ))}
    </View>
  );
}

function MetricCell({ metric }: { metric: Metric }) {
  const theme = useTheme();
  const [hovered, setHovered] = useState(false);
  const { label, value, note, icon: Icon, alert, onPress } = metric;
  const body = (
    <>
      <View style={styles.head}>
        {Icon ? <Icon size={16} color={alert ? theme.error : theme.muted} /> : null}
        <Text variant="caption" numberOfLines={1} style={[styles.flex, { color: theme.muted }]}>
          {label}
        </Text>
      </View>
      <Text variant="display-m" numberOfLines={1} adjustsFontSizeToFit style={styles.value}>
        {value}
      </Text>
      {note ? (
        <View style={styles.note}>
          {alert ? <CircleAlert size={14} color={theme.error} /> : null}
          <Text
            variant="caption"
            numberOfLines={2}
            style={[styles.flex, { color: alert ? theme.error : theme.meta }]}
          >
            {note}
          </Text>
        </View>
      ) : null}
    </>
  );
  if (!onPress) return <View style={styles.cell}>{body}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}${note ? `, ${note}` : ''}`}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={({ pressed }) => [
        styles.cell,
        (pressed || hovered) && { backgroundColor: theme.wash },
      ]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  leftEdge: { borderLeftWidth: StyleSheet.hairlineWidth },
  topEdge: { borderTopWidth: StyleSheet.hairlineWidth },
  cell: {
    flex: 1,
    gap: tokens.space[2],
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[4],
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
  flex: { flexShrink: 1 },
  value: { fontVariant: ['tabular-nums'] },
  note: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[1] },
});
