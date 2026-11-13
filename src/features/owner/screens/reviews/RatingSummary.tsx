import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Star, StarHalf } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { cardStyle } from '../../kit';
import { starCounts } from './reviewStats';

/**
 * The top of Reviews (design canvas): the average in big type with its stars, and beside it a bar
 * for each star level showing how many reviews gave it.
 */
export function RatingSummary({
  reviews,
  wide,
}: {
  reviews: readonly { stars: number }[];
  wide: boolean;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const average = reviews.reduce((sum, r) => sum + r.stars, 0) / reviews.length;
  const rows = starCounts(reviews);
  return (
    <View style={[styles.row, !wide && styles.stack]}>
      <View
        style={[cardStyle(theme), styles.card, styles.avg]}
        accessible
        accessibilityLabel={t('ownerReviews.summaryA11y', {
          avg: average.toFixed(1),
          count: reviews.length,
        })}
      >
        <Text style={[styles.label, { color: theme.muted }]}>{t('ownerReviews.average')}</Text>
        <View style={styles.big}>
          <Text style={styles.number}>{average.toFixed(1)}</Text>
          <Text style={[styles.from, { color: theme.meta }]}>
            {t('ownerReviews.count', { count: reviews.length })}
          </Text>
        </View>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((n) => {
            const full = average >= n;
            const half = !full && average >= n - 0.5;
            const Icon = half ? StarHalf : Star;
            return (
              <Icon
                key={n}
                size={20}
                color={full || half ? theme.ink : theme.line}
                fill={full || half ? theme.ink : 'transparent'}
              />
            );
          })}
        </View>
      </View>
      <View style={[cardStyle(theme), styles.card, styles.bars]}>
        {rows.map((row) => (
          <View
            key={row.stars}
            style={styles.bar}
            accessible
            accessibilityLabel={t('ownerReviews.starRowA11y', {
              stars: row.stars,
              count: row.count,
            })}
          >
            <Text style={[styles.barLabel, { color: theme.muted }]}>
              {t('ownerReviews.stars', { count: row.stars })}
            </Text>
            <View style={[styles.track, { backgroundColor: theme.tint }]}>
              <View
                style={[
                  styles.fill,
                  { backgroundColor: theme.fill, width: `${(row.count / reviews.length) * 100}%` },
                ]}
              />
            </View>
            <Text style={[styles.barCount, { color: theme.meta }]}>{row.count}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: tokens.owner.controls.listGap },
  stack: { flexDirection: 'column' },
  card: { padding: tokens.space[6], gap: 10 },
  avg: { flex: 1 },
  bars: { flex: 1.4, justifyContent: 'center' },
  label: { fontSize: 16, lineHeight: 20, fontFamily: fontFamily.strong },
  big: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  number: { fontSize: 44, lineHeight: 48, fontFamily: fontFamily.strong },
  from: { fontSize: 15, lineHeight: 20 },
  stars: { flexDirection: 'row', gap: 3 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barLabel: { width: 52, fontSize: 14, lineHeight: 20 },
  track: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  barCount: {
    width: 16,
    textAlign: 'right',
    fontSize: 14,
    lineHeight: 20,
    fontVariant: ['tabular-nums'],
  },
});
