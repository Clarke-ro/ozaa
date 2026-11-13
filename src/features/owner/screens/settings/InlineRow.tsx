import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

/** A settings row with its control on the right, like "Appearance  [Light | Dark | Follow]". */
export function InlineRow({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <Icon size={18} color={theme.muted} />
      <Text variant="body" style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    minHeight: 52,
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[2],
  },
  label: { flex: 1 },
});
