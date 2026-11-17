import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { FitText } from '@/ui/FitText';
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
      {/* One line that shrinks a little beside a wide control (Clarke, 2026-11-17). */}
      <FitText variant="body" style={styles.label} min={12}>
        {label}
      </FitText>
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
