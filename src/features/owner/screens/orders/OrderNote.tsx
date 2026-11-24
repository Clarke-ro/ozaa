import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MessageSquareText } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';

/**
 * The guest's instructions for the whole order ("Note: …"), under the dishes. It uses the same
 * soft yellow tag as a dish's own note, so the kitchen spots it the same way. Renders nothing
 * when the order has no note.
 */
export function OrderNote({
  note,
  compact,
  lines,
}: {
  note: string | null | undefined;
  /** Phones: one size down, like the rest of the ticket. */
  compact?: boolean;
  /** Cap the lines on a ticket; the order's page shows the whole note. */
  lines?: number;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const text = note?.trim();
  if (!text) return null;

  return (
    <View style={[styles.note, { backgroundColor: theme.warningTint }]}>
      <MessageSquareText size={compact ? 14 : 16} color={theme.text} style={styles.icon} />
      <Text
        style={[styles.text, compact && styles.textSm, { color: theme.text }]}
        numberOfLines={lines}
      >
        {t('ownerOrders.orderNote', { note: text })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: tokens.space[2],
    paddingHorizontal: tokens.space[3],
    paddingVertical: tokens.space[2],
    borderRadius: tokens.radius.sm,
  },
  // Sits on the first line of text rather than the middle of a long note.
  icon: { marginTop: 2 },
  text: { flex: 1, minWidth: 0, fontSize: 14, lineHeight: 20, fontFamily: fontFamily.regular },
  textSm: { fontSize: 13, lineHeight: 18 },
});
