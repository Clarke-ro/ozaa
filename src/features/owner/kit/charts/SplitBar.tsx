import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

// `amount`, not `value`: the Reanimated Babel plugin warns on a `p.value` read inside an inline style.
export type Part = { label: string; amount: number; color: string; icon?: LucideIcon };

/**
 * One bar split into parts (new vs returning guests, happy vs unhappy notes), with a 2 px gap
 * between parts and a legend that repeats each colour with its icon, word and share.
 */
export function SplitBar({
  parts,
  summary,
  showCount = true,
}: {
  parts: Part[];
  summary: string;
  /** Off when the amounts are already percentages. */
  showCount?: boolean;
}) {
  const theme = useTheme();
  const total = parts.reduce((sum, p) => sum + p.amount, 0);
  const share = (v: number) => (total ? Math.round((v / total) * 100) : 0);
  const spoken = `${summary}. ${parts.map((p) => `${p.label} ${share(p.amount)}%`).join(', ')}`;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={spoken} style={styles.wrap}>
      <View style={[styles.bar, { backgroundColor: theme.wash }]}>
        {parts.map((p) =>
          p.amount > 0 ? (
            <View key={p.label} style={{ flex: p.amount, backgroundColor: p.color }} />
          ) : null,
        )}
      </View>
      <View style={styles.legend}>
        {parts.map((p) => {
          const Icon = p.icon;
          return (
            <View key={p.label} style={styles.item}>
              {Icon ? (
                <Icon size={14} color={p.color} />
              ) : (
                <View style={[styles.dot, { backgroundColor: p.color }]} />
              )}
              <Text variant="caption" style={{ color: theme.text }}>
                {p.label}
              </Text>
              <Text variant="caption" style={[styles.num, { color: theme.muted }]}>
                {share(p.amount)}%{showCount ? ` · ${p.amount}` : ''}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.space[3] },
  bar: { flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden', gap: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[3] },
  item: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[1] },
  dot: { width: 10, height: 10, borderRadius: 5 },
  num: { fontVariant: ['tabular-nums'] },
});
