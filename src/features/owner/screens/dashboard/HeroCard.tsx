import { StyleSheet, View } from 'react-native';
import { PressableScale } from '@/ui/PressableScale';
import { ChevronRight } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';

const c = tokens.owner.controls;

/**
 * The day's main number in a dark card, the first thing on Today ("Sales today GH₵1,250").
 * Light mode uses the brand black; dark mode can't go darker than the page, so it uses the
 * raised grey instead. A small pill opens the page behind the number when this person may.
 */
export function HeroCard({
  label,
  value,
  note,
  link,
  onPress,
  compact,
}: {
  label: string;
  value: string;
  /** One sentence under the number, e.g. "You made GH₵2,480 today, 12% more than yesterday." */
  note?: string;
  link: string;
  /** Missing when this person may not open the page behind the number. */
  onPress?: () => void;
  /** Phones: no 192 px minimum and tighter padding, so the card is only as tall as its words. */
  compact?: boolean;
}) {
  const theme = useTheme();
  const dark = theme.scheme === 'dark';
  const bg = dark ? theme.wash : theme.black;
  const ink = dark ? theme.text : theme.white;

  return (
    <View style={[styles.card, compact && styles.compact, { backgroundColor: bg }]}>
      <View style={styles.top}>
        <Text variant="body-strong" style={{ color: ink }} numberOfLines={1}>
          {label}
        </Text>
        {onPress ? (
          <PressableScale
            accessibilityRole="link"
            accessibilityLabel={link}
            onPress={onPress}
            hitSlop={tokens.space[2]}
            style={({ pressed }) => [styles.pill, { opacity: pressed ? 0.7 : 1 }]}
          >
            {/* A see-through layer of the ink, so the pill reads on black and on dark grey. */}
            <View style={[StyleSheet.absoluteFill, styles.pillFill, { backgroundColor: ink }]} />
            <Text variant="caption" style={[styles.pillText, { color: ink }]}>
              {link}
            </Text>
            <ChevronRight size={14} color={ink} />
          </PressableScale>
        ) : null}
      </View>
      <Text
        style={[styles.value, compact && styles.compactValue, { color: ink }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      {/* Phones skip the sentence: the number and View sales say enough. */}
      {note && !compact ? (
        <Text variant="caption" style={[styles.note, { color: ink }]} numberOfLines={2}>
          {note}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    // Grows to the row's height next to the small cards; basis stays auto so it never collapses.
    flexGrow: 1,
    minHeight: c.statMinHeight,
    borderRadius: c.cardRadius,
    borderCurve: 'continuous',
    padding: c.statPadding,
    gap: c.statGap,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.space[2],
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 30,
    paddingHorizontal: tokens.space[3],
    borderRadius: tokens.radius.full,
    overflow: 'hidden',
  },
  pillFill: { opacity: 0.16, borderRadius: tokens.radius.full },
  pillText: { fontFamily: 'Inter_600' },
  value: {
    fontSize: tokens.owner.type.hero.size,
    lineHeight: tokens.owner.type.hero.line,
    fontFamily: fontFamily.strong,
    fontVariant: ['tabular-nums'],
  },
  note: { opacity: 0.8 },
  compact: { minHeight: 0, padding: tokens.space[4], gap: tokens.space[2] },
  compactValue: { fontSize: 32, lineHeight: 38, letterSpacing: -0.5 },
});
