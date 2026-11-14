import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { SalesReport } from '@/lib/api/types';
import { api } from '@/lib/api';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { VenueImage } from '@/ui/VenueImage';
import { fontFamily, useTheme } from '@/ui/theme';
import { cardStyle, Donut } from '../../kit';
import { ownerKeys } from '../../data/keys';
import { dishShares } from './salesModel';

/**
 * "Top dishes" (design canvas): the four dishes that took the most money as cards with their
 * photo, then "Other dishes"; beside them a ring of each one's share of order value.
 */
export function SalesDishes({ report: r, wide }: { report: SalesReport; wide: boolean }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const venue = useQuery({
    queryKey: ownerKeys.venue(venueId),
    queryFn: () => api.ownerGetVenue(venueId),
    enabled: Boolean(venueId),
  });
  const slug = venue.data?.slug ?? '';
  // Photos come from the menu; the report only names the dish.
  const menu = useQuery({
    queryKey: ownerKeys.menu(slug),
    queryFn: () => api.getMenu(slug),
    enabled: Boolean(slug),
  });
  const photo = (name: string) => menu.data?.items.find((i) => i.name.en === name)?.photo?.url;
  const money = (amount: number) => formatMoney(pesewas(amount), r.currency);
  const { top, other } = dishShares(r.topItems, r.valuePesewas);
  // Brand orange for the best seller, then darker greys, then the lightest for the rest.
  const colors = [theme.fill, theme.text, theme.muted, theme.meta, theme.line];
  if (top.length === 0) {
    return (
      <Text variant="body" style={{ color: theme.muted }}>
        {t('ownerSales.empty')}
      </Text>
    );
  }
  const rows = [
    ...top.map((d) => ({
      name: d.name,
      count: d.count,
      pesewas: d.pesewas,
      percent: d.percent,
      url: photo(d.name),
    })),
    ...(other
      ? [
          {
            name: t('ownerSales.otherDishes'),
            count: other.count,
            pesewas: other.pesewas,
            percent: other.percent,
            url: undefined,
          },
        ]
      : []),
  ];
  return (
    <View style={[styles.row, !wide && styles.stack]}>
      <View style={[styles.list, wide && { flex: 1.4 }]}>
        {rows.map((d, i) => (
          <View key={d.name} style={[cardStyle(theme), styles.dish]}>
            <View style={[styles.thumb, { backgroundColor: theme.wash }]}>
              {d.url ? (
                <VenueImage url={d.url} alt={d.name} style={StyleSheet.absoluteFill} />
              ) : null}
            </View>
            <View style={styles.words}>
              <Text style={styles.name} numberOfLines={1}>
                {d.name}
              </Text>
              <Text style={[styles.sub, { color: theme.meta }]}>
                {i === 0
                  ? t('ownerSales.soldShareLong', { count: d.count, percent: d.percent })
                  : t('ownerSales.soldShareShort', { count: d.count, percent: d.percent })}
              </Text>
            </View>
            <Text style={styles.value}>{money(d.pesewas)}</Text>
          </View>
        ))}
      </View>
      <View style={[cardStyle(theme), styles.share, wide && { flex: 1 }]}>
        <Text style={styles.shareTitle}>{t('ownerSales.shareTitle')}</Text>
        <Donut
          size={180}
          stroke={22}
          figure={money(r.valuePesewas)}
          caption={t('ownerSales.orderValueLower')}
          label={t('ownerSales.shareTitle')}
          parts={rows.map((d, i) => ({ value: d.pesewas, color: colors[i] ?? theme.line }))}
        />
        <View style={styles.legend}>
          {rows.map((d, i) => (
            <View key={d.name} style={styles.key}>
              <View style={[styles.dot, { backgroundColor: colors[i] ?? theme.line }]} />
              <Text style={styles.keyLabel} numberOfLines={1}>
                {d.name}
              </Text>
              <Text style={styles.keyValue}>{d.percent}%</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'stretch', gap: tokens.space[6] },
  stack: { flexDirection: 'column' },
  list: { gap: tokens.owner.controls.listGap, minWidth: 0 },
  dish: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 68,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: tokens.owner.controls.cardPadding,
  },
  thumb: { width: 48, height: 48, borderRadius: 10, overflow: 'hidden' },
  words: { flex: 1, minWidth: 0, gap: 2 },
  name: { fontSize: 16, lineHeight: 22, fontFamily: fontFamily.strong },
  sub: { fontSize: 14, lineHeight: 20 },
  value: {
    fontSize: 17,
    lineHeight: 22,
    fontFamily: fontFamily.strong,
    fontVariant: ['tabular-nums'],
  },
  share: { padding: tokens.space[6], alignItems: 'center', gap: tokens.space[5], minWidth: 0 },
  shareTitle: { alignSelf: 'stretch', fontSize: 15, lineHeight: 20, fontFamily: fontFamily.strong },
  legend: { alignSelf: 'stretch', gap: 10 },
  key: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  keyLabel: { flex: 1, fontSize: 15, lineHeight: 20 },
  keyValue: { fontSize: 15, lineHeight: 20, fontFamily: fontFamily.strong },
});
