import type { LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

/** Bordered number tile ("Live orders 4"). Tapping opens the screen behind the number. */
export function StatTile({
  label,
  value,
  note,
  icon: Icon,
  tone,
  onPress,
}: {
  label: string;
  value: string;
  note?: string;
  icon?: LucideIcon;
  /** `alert` draws attention to a number that needs action, with a red border as well as the icon. */
  tone?: 'alert';
  onPress?: () => void;
}) {
  const theme = useTheme();
  const alert = tone === 'alert';
  const body = (
    <>
      <View style={styles.head}>
        {Icon ? <Icon size={18} color={alert ? theme.error : theme.ink} /> : null}
        <Text variant="body" style={[styles.label, { color: theme.muted }]} numberOfLines={2}>
          {label}
        </Text>
      </View>
      <Text variant="display-m" style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {note ? (
        <Text variant="caption" style={{ color: theme.muted }}>
          {note}
        </Text>
      ) : null}
    </>
  );
  const look = [
    styles.tile,
    {
      borderColor: alert ? theme.error : theme.line,
      borderWidth: alert ? 1.5 : StyleSheet.hairlineWidth,
      backgroundColor: theme.surface,
    },
  ];
  if (!onPress) return <View style={look}>{body}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}${note ? `, ${note}` : ''}`}
      onPress={onPress}
      style={({ pressed }) => [look, pressed && { backgroundColor: theme.wash }]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    gap: tokens.space[2],
    padding: tokens.space[4],
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
    minHeight: 104,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
  label: { flex: 1 },
  value: { fontVariant: ['tabular-nums'] },
});
