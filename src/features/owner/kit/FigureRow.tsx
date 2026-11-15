import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { CardGrid } from './CardGrid';
import { cardStyle } from './cardStyle';

export type Figure = {
  label: string;
  value: string;
  /** A one- or two-word label for a phone tile ("Stamps given"); falls back to `label`. */
  short?: string;
};

/**
 * A row of white figure cards. Wide screens follow the design canvas (Staff, Loyalty): the label
 * in grey on top, the number under it, at least 128 px tall. Phones show up to three small tiles
 * in one row like Today's. Narrow phones and large text switch to two columns. Four always go two
 * by two. Each phone tile puts the number first, then a short grey label (Clarke, 2026-11-14).
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
  const { fontScale, width } = useWindowDimensions();
  const needsTwoColumns = width < 360 || fontScale > 1.3;
  const phoneColumns = needsTwoColumns ? Math.min(items.length, 2) : items.length;
  const columns = wide ? items.length : items.length <= 3 ? phoneColumns : 2;
  return (
    <CardGrid columns={columns} gap={wide ? tokens.owner.controls.listGap : 8} stretchLast>
      {items.map((item) =>
        wide ? (
          <View
            key={item.label}
            accessible
            accessibilityLabel={`${item.label}: ${item.value}`}
            style={[cardStyle(theme), styles.card]}
          >
            <Text style={[styles.label, { color: theme.muted }]} numberOfLines={2}>
              {item.label}
            </Text>
            <Text
              style={[styles.value, { fontSize: size, lineHeight: size + 6 }]}
              numberOfLines={1}
            >
              {item.value}
            </Text>
          </View>
        ) : (
          <View
            key={item.label}
            accessible
            accessibilityLabel={`${item.label}: ${item.value}`}
            style={[cardStyle(theme), styles.tile]}
          >
            <Text style={[styles.value, styles.tileValue]} numberOfLines={1} adjustsFontSizeToFit>
              {item.value}
            </Text>
            <Text style={[styles.tileLabel, { color: theme.muted }]} numberOfLines={2}>
              {item.short ?? item.label}
            </Text>
          </View>
        ),
      )}
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
  tile: { flex: 1, minWidth: 0, paddingVertical: 14, paddingHorizontal: 14, gap: 2 },
  label: { fontSize: 16, lineHeight: 20, fontFamily: fontFamily.strong },
  value: { fontFamily: fontFamily.strong, fontVariant: ['tabular-nums'], letterSpacing: -0.3 },
  tileValue: { fontSize: 26, lineHeight: 32, letterSpacing: -0.4 },
  tileLabel: { fontSize: 12, lineHeight: 16 },
});
