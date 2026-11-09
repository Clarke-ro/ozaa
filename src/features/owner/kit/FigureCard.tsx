import { Pressable, StyleSheet, View } from 'react-native';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { cardStyle } from './cardStyle';

export type Trend = { percent: number; label: string };

/**
 * One figure in a white card on a report page. `labelFirst` puts a small capital label over the
 * number with a grey note under it (Sales); `valueFirst` puts the number on top and what it
 * counts under it (Insights). `trend` adds the change against the period before, with an arrow
 * as well as green or red so it never rests on colour alone. Tappable when `onPress` is given.
 */
export function FigureCard({
  label,
  value,
  note,
  trend,
  order,
  onPress,
}: {
  label: string;
  value: string;
  note?: string;
  trend?: Trend | null;
  order: 'labelFirst' | 'valueFirst';
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
      <Text variant="caption" style={[styles.trendText, { color: trendInk }]} numberOfLines={1}>
        {trendText}
      </Text>
    </View>
  ) : null;
  const number = (
    <Text
      variant="display-m"
      style={[styles.value, order === 'labelFirst' && styles.small]}
      numberOfLines={1}
      adjustsFontSizeToFit
    >
      {value}
    </Text>
  );
  const body =
    order === 'labelFirst' ? (
      <>
        <Text variant="caption" style={[styles.caps, { color: theme.text }]} numberOfLines={2}>
          {label.toUpperCase()}
        </Text>
        {number}
        {trendRow}
        {note ? (
          <Text variant="caption" style={{ color: theme.muted }} numberOfLines={2}>
            {note}
          </Text>
        ) : null}
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
  card: { flex: 1, minWidth: 0, padding: tokens.space[4], gap: tokens.space[2] },
  caps: { fontFamily: fontFamily.strong, letterSpacing: tokens.owner.type.caps.letterSpacing },
  value: { fontVariant: ['tabular-nums'] },
  trend: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[1] },
  trendText: { fontFamily: fontFamily.strong },
  // Sales sets its figures smaller than Insights, as the reference dashboard does (design/reference).
  small: { fontSize: tokens.owner.type.figure.size, lineHeight: tokens.owner.type.figure.line },
});
