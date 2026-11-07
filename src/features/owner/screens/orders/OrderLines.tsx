import { StyleSheet, View } from 'react-native';
import { MessageSquareText } from 'lucide-react-native';
import type { Order } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

/** What to cook on an opened ticket: quantity, dish, add-ons and the guest's note. */
export function OrderLines({ lines }: { lines: Order['lines'] }) {
  const theme = useTheme();
  return (
    <View style={[styles.lines, { borderColor: theme.line }]}>
      {lines.map((line) => (
        <View key={line.id} style={styles.line}>
          <Text variant="body-strong" style={[styles.qty, styles.num]}>
            {line.quantity}×
          </Text>
          <View style={styles.flex}>
            <Text variant="body-strong">{line.name}</Text>
            {line.modifiers?.length ? (
              <Text variant="caption" style={{ color: theme.muted }}>
                + {line.modifiers.map((m) => m.name).join(', ')}
              </Text>
            ) : null}
            {line.note ? (
              <View style={[styles.note, { backgroundColor: theme.warningTint }]}>
                <MessageSquareText size={16} color={theme.text} />
                <Text variant="caption" style={styles.flex}>
                  {line.note}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  lines: {
    gap: tokens.space[3],
    paddingTop: tokens.space[4],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: tokens.space[3] },
  // A fixed column, so the dish names line up under each other.
  qty: { minWidth: tokens.space[8] },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    marginTop: tokens.space[1],
    paddingHorizontal: tokens.space[2],
    paddingVertical: tokens.space[1],
    borderRadius: tokens.radius.sm,
    alignSelf: 'flex-start',
  },
  num: { fontVariant: ['tabular-nums'] },
  flex: { flex: 1 },
});
