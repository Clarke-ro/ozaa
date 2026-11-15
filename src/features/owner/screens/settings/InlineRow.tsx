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
      <Icon size={20} color={theme.muted} />
      {/* Two lines rather than "Stamps on a full …" when the control beside it is wide. */}
      <Text variant="body" style={styles.label} numberOfLines={2}>
        {label}
      </Text>
      {/* The control may shrink, so a three-way switch never runs off a phone screen. */}
      <View style={styles.control}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    // Same as the kit rows (canvas): 60 px tall, 20 px in, 16 px between parts, 16 px label.
    gap: tokens.space[4],
    minHeight: 60,
    paddingHorizontal: tokens.owner.controls.cardPadding,
    paddingVertical: tokens.space[2],
  },
  label: { flex: 1, fontSize: 16, lineHeight: 22 },
  control: { flexShrink: 1, maxWidth: '68%' },
});
