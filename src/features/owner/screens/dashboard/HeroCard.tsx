import { Image, StyleSheet, View } from 'react-native';
import { PressableScale } from '@/ui/PressableScale';
import { ChevronRight } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';

const c = tokens.owner.controls;
// A 128 px tile of faint dark and light specks, repeated across the card.
const GRAIN = require('../../../../../assets/images/grain.png');

/**
 * The day's main number on a card in the theme's primary colour, the first thing on Today
 * ("Sales today GH₵1,250"). Fill and text come from the theme (Clarke, 2026-11-23), so the card
 * follows the venue colour, and deriveTheme has already checked the text contrast.
 * A small pill opens the page behind the number when this person may. A fine grain sits over the
 * colour for texture (Clarke, 2026-11-17); it is faint, so the text keeps its contrast.
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
  const bg = theme.fill;
  const ink = theme.onFill;

  return (
    <View style={[styles.card, compact && styles.compact, { backgroundColor: bg }]}>
      <Image
        source={GRAIN}
        resizeMode="repeat"
        accessibilityIgnoresInvertColors
        aria-hidden
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.grain]}
      />
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
            {/* A see-through layer of the ink, so the pill reads on the fill. */}
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
    overflow: 'hidden',
  },
  // 0.3, not 0.6: the tile has more dark specks than light, so at 0.6 it pulled the orange down to
  // a muddy #C73F03. At 0.3 the card averages about #CC3E01 and reads as the same orange as the
  // buttons and badges (Clarke, 2026-11-23).
  grain: { width: '100%', height: '100%', opacity: 0.3 },
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
