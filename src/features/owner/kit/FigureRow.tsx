import { StyleSheet, View } from 'react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { CardGrid } from './CardGrid';
import { cardStyle } from './cardStyle';

export type Figure = { label: string; value: string };

/**
 * A row of white figure cards from the design canvas (Staff, Loyalty): the label in grey on top,
 * the number under it, at least 128 px tall. Phones show them two by two.
 */
export function FigureRow({
  items,
  wide,
  size = 32,
}: {
  items: readonly Figure[];
  /** Room to put every card in one row. */
  wide: boolean;
  /** Number size in px; the canvas uses 32 on Staff and Loyalty. */
  size?: number;
}) {
  const theme = useTheme();
  return (
    <CardGrid columns={wide ? items.length : 2} gap={tokens.owner.controls.listGap}>
      {items.map((item) => (
        <View
          key={item.label}
          accessible
          accessibilityLabel={`${item.label}: ${item.value}`}
          style={[cardStyle(theme), styles.card]}
        >
          <Text style={[styles.label, { color: theme.muted }]} numberOfLines={2}>
            {item.label}
          </Text>
          <Text style={[styles.value, { fontSize: size, lineHeight: size + 6 }]} numberOfLines={1}>
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
  label: { fontSize: 16, lineHeight: 20, fontFamily: fontFamily.strong },
  value: { fontFamily: fontFamily.strong, fontVariant: ['tabular-nums'] },
});
