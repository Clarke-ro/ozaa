import { StyleSheet, View } from 'react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { CardGrid } from './CardGrid';
import { cardStyle } from './cardStyle';

export type Figure = { label: string; value: string };

/**
 * A row of white figure cards from the design canvas (Staff, Loyalty): the label in grey on top,
 * the number under it, at least 128 px tall. Phones keep up to three in one row as small tiles
 * (a 24 px number, 14 px padding), so the figures take one short band, not half the screen;
 * four go two by two.
 */
export function FigureRow({
  items,
  wide,
  size = 32,
}: {
  items: readonly Figure[];
  /** Room to put every card in one row. */
  wide: boolean;
  /** Number size in px on wide screens; the canvas uses 32 on Staff and Loyalty. */
  size?: number;
}) {
  const theme = useTheme();
  const columns = wide || items.length <= 3 ? items.length : 2;
  const number = wide ? size : 24;
  return (
    <CardGrid columns={columns} gap={wide ? tokens.owner.controls.listGap : 8} stretchLast>
      {items.map((item) => (
        <View
          key={item.label}
          accessible
          accessibilityLabel={`${item.label}: ${item.value}`}
          style={[cardStyle(theme), styles.card, !wide && styles.small]}
        >
          <Text
            style={[styles.label, !wide && styles.smallLabel, { color: theme.muted }]}
            // Three lines on a phone tile, so "Rewards claimed, 30 days" is never cut short.
            numberOfLines={wide ? 2 : 3}
          >
            {item.label}
          </Text>
          <Text
            style={[styles.value, { fontSize: number, lineHeight: number + 6 }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {item.value}
          </Text>
        </View>
      ))}
    </CardGrid>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    minHeight: 128,
    padding: tokens.owner.controls.cardPadding,
    gap: tokens.space[3],
  },
  small: {
    minHeight: 92,
    padding: 14,
    gap: tokens.space[2],
    justifyContent: 'space-between',
  },
  label: { fontSize: 16, lineHeight: 20, fontFamily: fontFamily.strong },
  smallLabel: { fontSize: 13, lineHeight: 17 },
  value: { fontFamily: fontFamily.strong, fontVariant: ['tabular-nums'], letterSpacing: -0.3 },
});
