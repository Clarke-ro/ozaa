import { Pressable, StyleSheet, View } from 'react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { cardStyle } from '../../kit/cardStyle';

/** One small white stat card on Today: the number on top, what it counts under it. */
export function StatCard({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  /** Missing when this person may not open the page behind the number. */
  onPress?: () => void;
}) {
  const theme = useTheme();
  const body = (
    <>
      <Text variant="display-m" style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text variant="caption" style={[styles.label, { color: theme.muted }]} numberOfLines={2}>
        {label}
      </Text>
    </>
  );
  const spoken = `${value} ${label}`;

  if (!onPress) {
    return (
      <View style={[styles.card, cardStyle(theme)]} accessible accessibilityLabel={spoken}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={spoken}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        cardStyle(theme),
        pressed && { backgroundColor: theme.wash },
      ]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    padding: tokens.space[4],
    gap: tokens.space[3],
    justifyContent: 'space-between',
  },
  value: { fontVariant: ['tabular-nums'] },
  label: { fontSize: tokens.owner.type.nav.size, lineHeight: tokens.owner.type.nav.line },
});
