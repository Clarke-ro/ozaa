import { StyleSheet, View } from 'react-native';
import { tokens } from '@/theme/tokens';
import { PressableScale } from '@/ui/PressableScale';
import { FitText } from '@/ui/FitText';
import { fontFamily, useTheme } from '@/ui/theme';
import { cardStyle } from '../../kit/cardStyle';

const c = tokens.owner.controls;
const t = tokens.owner.type;

/**
 * One small white stat card on Today. Wide screens follow the canvas: what it counts on top, the
 * big number under it. Phones (`compact`) put the number first and the label under it in grey,
 * in a short tile, so the three sit in one tidy band (Clarke's reference, 2026-11-14).
 */
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
  compact?: boolean;
}) {
  const theme = useTheme();
  const body = compact ? (
    <>
      <FitText style={styles.small} min={16}>
        {value}
      </FitText>
      {/* 9 px only on the smallest phones (iPhone SE): one line beats a cut-off "Pending o…". */}
      <FitText style={[styles.smallLabel, { color: theme.muted }]} min={9}>
        {label}
      </FitText>
    </>
  ) : (
    <>
      {/* Same height as the dark card's top line, so the numbers line up across the row. */}
      <View style={styles.top}>
        <FitText style={[styles.label, { color: theme.muted }]}>{label}</FitText>
      </View>
      <FitText style={styles.value} min={20}>
        {value}
      </FitText>
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
    minHeight: 0,
    paddingVertical: 14,
    paddingHorizontal: 10,
    gap: 2,
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
  small: {
    fontSize: 26,
    lineHeight: 32,
    fontFamily: fontFamily.strong,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.4,
  },
  smallLabel: { fontSize: 12, lineHeight: 16 },
});
