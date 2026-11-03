import { useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Frown, Gift, Meh, QrCode, Smile, UtensilsCrossed } from 'lucide-react-native';
import { api } from '@/lib/api';
import type { InsightsReport } from '@/lib/api/types';
import { pesewas } from '@/lib/brand';
import { PAYMENTS_ENABLED } from '@/lib/features';
import { formatMoney } from '@/lib/money';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { useTheme } from '@/ui/theme';
import { DeskWait, OwnerPage, SkeletonBlock } from '../../chrome/OwnerPage';
import { ownerKeys } from '../../data/keys';
import { insightTiles } from '../../desk/dashboardModel';
import {
  BarChart,
  ChartCard,
  HourStrip,
  hourLabel,
  RankBars,
  Segmented,
  SplitBar,
  StatTile,
  StatusPill,
} from '../../kit';
import { busiestHour, moodTotals, shortMoney } from './insightsModel';

type Range = InsightsReport['range'];

export function InsightsScreen() {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const [range, setRange] = useState<Range>('7d');
  const report = useQuery({
    queryKey: ownerKeys.insights(venueId, range),
    queryFn: () => api.ownerGetInsights(venueId, range),
    enabled: Boolean(venueId),
  });
  const r = report.data;
  const two = width >= 900;

  const money = (minor: number) => formatMoney(pesewas(minor), r?.currency ?? 'GHS');
  const mood = moodTotals(r?.feedbackSentimentSeries);
  const moodTotal = mood.positive + mood.neutral + mood.negative;
  const peak = r ? busiestHour(r.peakHours) : null;
  const tiles = insightTiles(r);
  const n = (v: number) => v.toLocaleString(i18n.language);

  return (
    <OwnerPage
      title={t('owner.insights')}
      action={r?.sample ? <StatusPill label={t('ownerDash.sample')} tone="neutral" boxed /> : null}
    >
      <Segmented<Range>
        label={t('ownerDash.rangeLabel')}
        value={range}
        onChange={setRange}
        options={(['today', '7d', '30d', '90d'] as const).map((id) => ({
          id,
          label: t(`ownerInsights.range.${id}`),
        }))}
      />
      <DeskWait
        loading={report.isLoading}
        error={report.isError}
        onRetry={() => void report.refetch()}
        skeleton={<SkeletonBlock height={260} />}
      >
        {r ? (
          <View style={styles.stack}>
            {PAYMENTS_ENABLED ? (
              <ChartCard
                title={t('ownerInsights.sales')}
                figure={money(r.salesPesewas)}
                rows={r.series.map((p) => ({ label: p.label, value: money(p.pesewas) }))}
                empty={r.series.length ? undefined : t('ownerDash.noTrend')}
              >
                <BarChart
                  bars={r.series.map((p) => ({ label: p.label, value: p.pesewas }))}
                  format={money}
                  summary={t('ownerInsights.sales')}
                />
              </ChartCard>
            ) : null}

            {tiles.length ? (
              <View style={styles.grid}>
                {tiles.slice(0, 2).map((tile) => (
                  <View key={tile.id} style={styles.half}>
                    <StatTile
                      label={t(`ownerDash.tiles.${tile.id}`)}
                      value={n(tile.value)}
                      icon={tile.id === 'scans' ? QrCode : UtensilsCrossed}
                    />
                  </View>
                ))}
              </View>
            ) : null}

            <View style={[styles.pair, two && styles.row]}>
              <View style={styles.flex}>
                <ChartCard
                  title={t('ownerInsights.topDishes')}
                  rows={r.topItems.map((item) => ({
                    label: item.name,
                    value: PAYMENTS_ENABLED
                      ? money(item.pesewas)
                      : t('ownerInsights.sold', { count: item.count }),
                  }))}
                  empty={r.topItems.length ? undefined : t('ownerDash.noTrend')}
                >
                  {/* Payments off: rank by how many sold, which comes from orders, not money taken. */}
                  <RankBars
                    items={[...r.topItems]
                      .sort((a, b) =>
                        PAYMENTS_ENABLED ? b.pesewas - a.pesewas : b.count - a.count,
                      )
                      .slice(0, 5)
                      .map((item) =>
                        PAYMENTS_ENABLED
                          ? {
                              label: item.name,
                              value: item.pesewas,
                              detail: t('ownerInsights.sold', { count: item.count }),
                            }
                          : { label: item.name, value: item.count },
                      )}
                    format={(v) => (PAYMENTS_ENABLED ? shortMoney(v, r.currency) : n(v))}
                  />
                </ChartCard>
              </View>
              <View style={styles.flex}>
                <ChartCard
                  title={t('ownerInsights.busy')}
                  figure={peak != null ? hourLabel(peak) : undefined}
                  caption={peak != null ? t('ownerInsights.busiest') : undefined}
                  rows={r.peakHours.map((h) => ({
                    label: hourLabel(h.hour),
                    value: t('ownerInsights.orders', { count: h.orders }),
                  }))}
                  empty={peak == null ? t('ownerDash.noTrend') : undefined}
                >
                  <HourStrip hours={r.peakHours} summary={t('ownerInsights.busy')} />
                </ChartCard>
              </View>
            </View>

            <View style={[styles.pair, two && styles.row]}>
              <View style={styles.flex}>
                <ChartCard
                  title={t('ownerInsights.guests')}
                  figure={`${r.repeatGuests.sharePercent}%`}
                  caption={t('ownerInsights.returning', { count: r.repeatGuests.count })}
                >
                  <SplitBar
                    showCount={false}
                    summary={t('ownerInsights.guests')}
                    parts={[
                      {
                        label: t('ownerInsights.returningShort'),
                        amount: r.repeatGuests.sharePercent,
                        color: theme.fill,
                      },
                      {
                        label: t('ownerInsights.firstVisit'),
                        amount: 100 - r.repeatGuests.sharePercent,
                        color: theme.line,
                      },
                    ]}
                  />
                </ChartCard>
              </View>
              <View style={styles.flex}>
                <ChartCard
                  title={t('ownerInsights.mood')}
                  figure={moodTotal ? n(moodTotal) : undefined}
                  caption={moodTotal ? t('ownerInsights.notes') : undefined}
                  empty={moodTotal ? undefined : t('ownerDash.noTrend')}
                >
                  <SplitBar
                    summary={t('ownerInsights.mood')}
                    parts={[
                      {
                        label: t('ownerFeedback.mood.positive'),
                        amount: mood.positive,
                        color: theme.success,
                        icon: Smile,
                      },
                      {
                        label: t('ownerFeedback.mood.neutral'),
                        amount: mood.neutral,
                        color: theme.meta,
                        icon: Meh,
                      },
                      {
                        label: t('ownerFeedback.mood.negative'),
                        amount: mood.negative,
                        color: theme.error,
                        icon: Frown,
                      },
                    ]}
                  />
                </ChartCard>
              </View>
            </View>

            {tiles.length > 2 ? (
              <ChartCard title={t('owner.loyalty')}>
                <View style={styles.grid}>
                  {tiles.slice(2).map((tile) => (
                    <View key={tile.id} style={styles.half}>
                      <StatTile
                        label={t(`ownerDash.tiles.${tile.id}`)}
                        value={n(tile.value)}
                        icon={Gift}
                        onPress={() => router.push('/owner/loyalty')}
                      />
                    </View>
                  ))}
                </View>
              </ChartCard>
            ) : null}
          </View>
        ) : null}
      </DeskWait>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[4] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[3] },
  half: { flexBasis: '47%', flexGrow: 1 },
  pair: { gap: tokens.space[4] },
  row: { flexDirection: 'row' },
  flex: { flex: 1 },
});
