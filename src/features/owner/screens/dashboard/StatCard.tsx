import { Pressable, StyleSheet, View } from 'react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { cardStyle } from '../../kit/cardStyle';

const c = tokens.owner.controls;
const t = tokens.owner.type;

/** One small white stat card on Today: what it counts on top, the big number under it (canvas). */
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
      {/* Same height as the dark card's top line, so the numbers line up across the row. */}
      <View style={styles.top}>
        <Text style={[styles.label, { color: theme.muted }]} numberOfLines={2}>
          {label}
        </Text>
      </View>
      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </>
  );
  const spoken = `${label} ${value}`;

  if (!onPress) {
    return (
      <View style={[cardStyle(theme), styles.card]} accessible accessibilityLabel={spoken}>
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
        cardStyle(theme),
        styles.card,
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
    minHeight: c.statMinHeight,
    paddingVertical: c.statPadding,
    paddingHorizontal: c.cardPadding,
    gap: c.statGap,
  },
  top: { minHeight: 30, justifyContent: 'center' },
  label: { fontSize: t.body.size, lineHeight: 20, fontFamily: fontFamily.strong },
  value: {
    fontSize: t.hero.size,
    lineHeight: t.hero.line,
    fontFamily: fontFamily.strong,
    fontVariant: ['tabular-nums'],
  },
});
