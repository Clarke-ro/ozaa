import { StyleSheet, View } from 'react-native';
import { Star } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

export type InfoBox = {
  key: string;
  title: string;
  detail: string | null;
  /** Green, for "Open". */
  good?: boolean;
  /** A gold star before the title, for the rating. */
  star?: boolean;
};

/**
 * The row of small grey boxes under the venue name: table, time, open hours (design canvas,
 * Clarke 2026-11-23). Each box is a short bold line over a small one.
 */
export function InfoBoxes({ items }: { items: InfoBox[] }) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      {items.map((item) => {
        const ink = item.good ? theme.success : theme.text;
        return (
          <View
            key={item.key}
            accessible
            accessibilityLabel={item.detail ? `${item.title}, ${item.detail}` : item.title}
            style={[styles.box, { backgroundColor: item.good ? theme.successTint : theme.wash }]}
          >
            <View style={styles.titleRow}>
              {item.star ? <Star size={13} color={STAR} fill={STAR} strokeWidth={1.5} /> : null}
              <Text variant="body-strong" numberOfLines={1} style={[styles.title, { color: ink }]}>
                {item.title}
              </Text>
            </View>
            {item.detail ? (
              <Text
                variant="caption"
                numberOfLines={1}
                style={[styles.detail, { color: item.good ? theme.success : theme.muted }]}
              >
                {item.detail}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

// The rating star's gold, as on the design canvas. Decoration next to the number, not text.
const STAR = '#F5A524';

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: tokens.space[2] },
  box: {
    flex: 1,
    minHeight: 48,
    borderRadius: tokens.radius.md,
    borderCurve: 'continuous',
    paddingHorizontal: tokens.space[2],
    paddingVertical: tokens.space[1] + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  title: { fontSize: 15, lineHeight: 20, fontVariant: ['tabular-nums'] },
  detail: { fontSize: 11, lineHeight: 14 },
});
