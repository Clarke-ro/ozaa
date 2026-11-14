import { StyleSheet, View } from 'react-native';
import { PressableScale } from '@/ui/PressableScale';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { cardStyle } from './cardStyle';

export type Trend = { percent: number; label: string };

/**
 * One figure in a white card on a report page. `labelFirst` puts the label (16 px, grey, as on the
 * design canvas) over the number with a grey note under it (Sales, Calls); `valueFirst` puts the number on top and what it
 * counts under it (Insights). `trend` adds the change against the period before, with an arrow
 * as well as green or red so it never rests on colour alone. Tappable when `onPress` is given.
 */
export function FigureCard({
  label,
  value,
  note,
  trend,
  order,
  aside,
  tall,
  compact,
  narrow,
  onPress,
}: {
  label: string;
  value: string;
  note?: string;
  trend?: Trend | null;
  order: 'labelFirst' | 'valueFirst';
  /** A short red word beside the number, e.g. "1 late" on Calls (canvas). */
  aside?: string;
  /** The taller card with a 34 px number, as on Calls (canvas). */
  tall?: boolean;
  /** Sales' five-across card (canvas): 15 px label, 28 px number, the change or note at the bottom. */
  compact?: boolean;
  /**
   * A half-width phone card. Long amounts like "GH₵137.82" step down in size so they fit, since
   * `adjustsFontSizeToFit` only works on iOS and Android, not in a phone's browser.
   */
  narrow?: boolean;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const up = trend ? trend.percent > 0 : false;
  const down = trend ? trend.percent < 0 : false;
  const Arrow = up ? TrendingUp : down ? TrendingDown : Minus;
  const trendInk = up ? theme.success : down ? theme.error : theme.muted;
  const trendText = trend ? `${Math.abs(trend.percent)}% ${trend.label}` : '';
  const trendRow = trend ? (
    <View style={styles.trend}>
      <Arrow size={14} color={trendInk} />
      <Text
        variant="caption"
        style={[styles.trendText, compact && styles.small, { color: trendInk }]}
        numberOfLines={2}
      >
        {trendText}
      </Text>
    </View>
  ) : null;
  const figure = (
    <Text
      style={[
        styles.value,
        tall && styles.tallValue,
        compact && styles.compactValue,
        narrow && narrowSize(value),
      ]}
      numberOfLines={1}
      adjustsFontSizeToFit
    >
      {value}
    </Text>
  );
  const number = aside ? (
    <View style={styles.asideRow}>
      {figure}
      <Text style={[styles.aside, { color: theme.error }]}>{aside}</Text>
    </View>
  ) : (
    figure
  );
  const body =
    order === 'labelFirst' ? (
      <>
        <Text
          style={[styles.label, compact && styles.compactLabel, { color: theme.muted }]}
          numberOfLines={2}
        >
          {label}
        </Text>
        {number}
        <View style={compact ? styles.bottom : styles.notes}>
          {trendRow}
          {note ? (
            <Text
              variant="caption"
              style={[{ color: theme.muted }, compact && styles.small]}
              numberOfLines={2}
            >
              {note}
            </Text>
          ) : null}
        </View>
      </>
    ) : (
      <>
        {number}
        <Text variant="body" style={{ color: theme.muted }} numberOfLines={2}>
          {label}
        </Text>
        {trendRow}
      </>
    );
  const spoken = `${label}: ${value}${trend ? `, ${up ? '+' : down ? '-' : ''}${trendText}` : ''}${note ? `, ${note}` : ''}`;

  if (!onPress) {
    return (
      <View
        style={[styles.card, cardStyle(theme), tall && styles.tall, compact && styles.compact]}
        accessible
        accessibilityLabel={aside ? `${spoken}, ${aside}` : spoken}
      >
        {body}
      </View>
    );
  }
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={spoken}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        cardStyle(theme),
        tall && styles.tall,
        compact && styles.compact,
        pressed && { backgroundColor: theme.wash },
      ]}
    >
      {body}
    </PressableScale>
  );
}

/**
 * Number size for a half-width phone card, about 120 px of room at 360 px wide. A figure
 * character is roughly 0.6 of the font size, so up to 6 characters keep 28 px, up to 8
 * ("GH₵1,378") drop to 22 px, and longer amounts ("GH₵137.82") to 17 px.
 */
function narrowSize(value: string) {
  if (value.length <= 6) return null;
  return value.length <= 8 ? styles.narrowMid : styles.narrowSmall;
}

const styles = StyleSheet.create({
  // Canvas figure card: 20 px padding, 16 px label, 30 px number.
  card: {
    flex: 1,
    minWidth: 0,
    padding: tokens.owner.controls.cardPadding,
    gap: tokens.space[2],
  },
  label: {
    fontFamily: fontFamily.strong,
    fontSize: tokens.owner.type.body.size,
    lineHeight: 20,
  },
  value: {
    fontFamily: fontFamily.strong,
    fontSize: tokens.owner.type.figure.size,
    lineHeight: tokens.owner.type.figure.line,
    fontVariant: ['tabular-nums'],
  },
  tall: { minHeight: 128, gap: tokens.space[3] },
  compact: { minHeight: 140 },
  compactLabel: { fontSize: 15, lineHeight: 20 },
  compactValue: { fontSize: 28, lineHeight: 34 },
  narrowMid: { fontSize: 22, lineHeight: 34 },
  narrowSmall: { fontSize: 17, lineHeight: 34 },
  notes: { gap: tokens.space[2] },
  bottom: { marginTop: 'auto', gap: tokens.space[1] },
  small: { fontSize: 13, lineHeight: 18 },
  tallValue: { fontSize: 34, lineHeight: 40 },
  asideRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  aside: { fontSize: 14, lineHeight: 20, fontFamily: fontFamily.strong },
  trend: { flexDirection: 'row', alignItems: 'flex-start', gap: tokens.space[1] },
  // flexShrink lets a long trend wrap inside the card instead of running past it.
  trendText: { fontFamily: fontFamily.strong, flexShrink: 1 },
});
