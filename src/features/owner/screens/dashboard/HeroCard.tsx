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
 * The day's main number on a black card with white text, the first thing on Today ("Sales today
 * GH₵1,250"; Clarke, 2026-11-23). White on #111111 is about 19:1. The card stays black in dark
 * mode, with a 1 px edge so it doesn't sink into the near-black page.
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
  const bg = tokens.color.black.hex;
  const ink = tokens.color.white.hex;
  const edge = theme.scheme === 'dark' ? theme.line : bg;

  return (
    <View
      style={[styles.card, compact && styles.compact, { backgroundColor: bg, borderColor: edge }]}
    >
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
            {/* A see-through layer of the ink, so the pill reads on the black. */}
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
    borderWidth: 1,
    overflow: 'hidden',
  },
  // On black only the tile's light specks show (the dark ones vanish), so it can sit at 0.6 and
  // still read as a fine texture without greying the card.
  grain: { width: '100%', height: '100%', opacity: 0.6 },
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
