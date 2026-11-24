import { StyleSheet, View } from 'react-native';
import { MessageSquareText } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

/**
 * The guest's note for the whole order (Order.note), on the same amber as a dish's note so the
 * kitchen spots it. Draws nothing when there is no note.
 */
export function OrderNote({ note, lines }: { note?: string | null; lines?: number }) {
  const { t } = useTranslation();
  const theme = useTheme();
  if (!note) return null;
  return (
    <View
      accessible
      accessibilityLabel={t('ownerOrders.orderNote', { note })}
      style={[styles.note, { backgroundColor: theme.warningTint }]}
    >
      <MessageSquareText size={16} color={theme.text} />
      <Text variant="body-strong" numberOfLines={lines} style={styles.shrink}>
        {note}
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
  shrink: { flexShrink: 1 },
});
