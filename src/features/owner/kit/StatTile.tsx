import type { LucideIcon } from 'lucide-react-native';
import { TrendingDown, TrendingUp } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { PressableScale } from '@/ui/PressableScale';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { FitText } from '@/ui/FitText';
import { useTheme } from '@/ui/theme';

/**
 * A metric card: label top left, icon in a subtle badge top right, the number, and an optional short line under it.
 */
export function StatTile({
  label,
  value,
  note,
  icon: Icon,
  tone,
  trend,
  onPress,
}: {
  label: string;
  value: string;
  note?: string;
  icon?: LucideIcon;
  /** `alert` marks a number that needs action now, with a red edge and icon as well as colour. */
  tone?: 'alert';
  trend?: 'up' | 'down';
  onPress?: () => void;
}) {
  const theme = useTheme();
  const alert = tone === 'alert';
  const noteInk =
    trend === 'up' ? theme.success : trend === 'down' || alert ? theme.error : theme.muted;
  const Arrow = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : null;
  const body = (
    <>
      <View style={styles.head}>
        <FitText variant="caption" style={[styles.label, { color: theme.muted }]}>
          {label}
        </FitText>
        {Icon ? (
          <View style={[styles.icon, { backgroundColor: alert ? theme.errorTint : theme.wash }]}>
            <Icon size={16} color={alert ? theme.error : theme.ink} />
          </View>
        ) : null}
      </View>
      <FitText variant="display-m" style={styles.value}>
        {value}
      </FitText>
      {note ? (
        <View style={styles.note}>
          <Text variant="caption" style={{ color: noteInk }} numberOfLines={1}>
            {note}
          </Text>
          {Arrow ? <Arrow size={14} color={noteInk} /> : null}
        </View>
      ) : null}
    </>
  );
  const look = [
    styles.tile,
    {
      // Flat card with a thin border; an alert gets a red edge so it still stands out.
      borderColor: alert ? theme.error : theme.line,
      borderWidth: alert ? 1.5 : StyleSheet.hairlineWidth,
      backgroundColor: theme.surface,
    },
  ];
  if (!onPress) return <View style={look}>{body}</View>;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}${note ? `, ${note}` : ''}`}
      onPress={onPress}
      style={({ pressed }) => [look, pressed && { backgroundColor: theme.wash }]}
    >
      {body}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  tile: {
    gap: tokens.space[2],
    padding: tokens.space[4],
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
    minHeight: 100,
    justifyContent: 'space-between',
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
  // Only Inter 400 and 600 are loaded (theme/fonts.ts); 500 fell back to a serif.
  label: { flex: 1, fontFamily: 'Inter_400' },
  icon: {
    width: 32,
    height: 32,
    borderRadius: tokens.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { fontVariant: ['tabular-nums'] },
  note: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
