import { Check, Clock, AlertCircle, type LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

export type PillTone = 'success' | 'waiting' | 'error' | 'accent' | 'neutral';

const ICON: Partial<Record<PillTone, LucideIcon>> = {
  success: Check,
  waiting: Clock,
  error: AlertCircle,
};

/**
 * Small status word with an icon, e.g. "✓ Paid" or "◷ Waiting" (render: 04-owner-dashboard).
 * `boxed` draws a tinted pill for badges like "Ready" or "Sample".
 */
export function StatusPill({
  label,
  tone,
  boxed,
  icon,
}: {
  label: string;
  tone: PillTone;
  boxed?: boolean;
  icon?: boolean;
}) {
  const theme = useTheme();
  const color =
    tone === 'success'
      ? theme.success
      : tone === 'error'
        ? theme.error
        : tone === 'waiting'
          ? theme.warning
          : tone === 'accent'
            ? theme.badgeInk
            : theme.muted;
  const bg = !boxed
    ? 'transparent'
    : tone === 'accent'
      ? theme.tint
      : tone === 'success'
        ? theme.successTint
        : tone === 'error'
          ? theme.errorTint
          : tone === 'waiting'
            ? theme.warningTint
            : theme.wash;
  const Icon = icon === false ? undefined : ICON[tone];
  return (
    <View style={[styles.pill, boxed && styles.boxed, { backgroundColor: bg }]}>
      {Icon ? <Icon size={16} color={color} strokeWidth={2.2} /> : null}
      <Text variant={boxed ? 'caption' : 'body-strong'} style={{ color, fontFamily: 'Inter_600' }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  boxed: {
    paddingHorizontal: tokens.space[2],
    paddingVertical: 2,
    borderRadius: tokens.radius.full,
  },
});
