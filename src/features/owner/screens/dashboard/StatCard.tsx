import { StyleSheet, View } from 'react-native';
import { PressableScale } from '@/ui/PressableScale';
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
  compact,
}: {
  label: string;
  value: string;
  /** Missing when this person may not open the page behind the number. */
  onPress?: () => void;
  /**
   * Phones: three cards share about 340 px, so the canvas's 192 px height and 38 px number
   * leave a tall empty card. Compact keeps the same look at phone size.
   */
  compact?: boolean;
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
      <Text
        style={[styles.value, compact && styles.compactValue]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
    </>
  );
  const spoken = `${label} ${value}`;
  const look = [cardStyle(theme), styles.card, compact && styles.compact];

  if (!onPress) {
    return (
      <View style={look} accessible accessibilityLabel={spoken}>
        {body}
      </View>
    );
  }
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={spoken}
      onPress={onPress}
      style={({ pressed }) => [look, pressed && { backgroundColor: theme.wash }]}
    >
      {body}
    </PressableScale>
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
  compact: {
    // Taller than wide on a phone, with the number at the bottom, so the three read as tiles.
    minHeight: 124,
    justifyContent: 'space-between',
    paddingVertical: tokens.space[4],
    paddingHorizontal: tokens.space[4],
    gap: tokens.space[2],
  },
  top: { minHeight: 30, justifyContent: 'center' },
  label: { fontSize: t.body.size, lineHeight: 20, fontFamily: fontFamily.strong },
  value: {
    fontSize: t.hero.size,
    lineHeight: t.hero.line,
    fontFamily: fontFamily.strong,
    fontVariant: ['tabular-nums'],
    // Big numbers are tracked in a little, as large type is on iOS.
    letterSpacing: -0.5,
  },
  compactValue: { fontSize: t.figure.size, lineHeight: t.figure.line },
});
