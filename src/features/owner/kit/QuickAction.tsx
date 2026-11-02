import type { LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet } from 'react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

/** Outlined shortcut with an orange icon ("Table QR", "Edit menu"). Not a filled button. */
export function QuickAction({ label, icon: Icon, onPress }: { label: string; icon: LucideIcon; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.box, { borderColor: theme.line, backgroundColor: pressed ? theme.wash : theme.white }]}
    >
      <Icon size={22} color={theme.ink} strokeWidth={2} />
      <Text variant="body-strong" numberOfLines={1} style={styles.label}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    minWidth: 140,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    minHeight: 52,
    paddingHorizontal: tokens.space[4],
    borderWidth: 1,
    borderRadius: tokens.radius.md,
  },
  label: { fontSize: 16 },
});
