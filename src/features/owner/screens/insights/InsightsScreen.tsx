import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Frown, Meh, Smile } from 'lucide-react-native';
import { api } from '@/lib/api';
import type { InsightsReport } from '@/lib/api/types';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { useTheme } from '@/ui/theme';
import { DeskWait, OwnerPage, SkeletonBlock } from '../../chrome/OwnerPage';
import { ownerKeys } from '../../data/keys';
import {
  BarChart,
  ChartCard,
  HourStrip,
  hourLabel,
  PeriodSelect,
  RankTable,
  SplitBar,
  StatusPill,
} from '../../kit';
import { InsightFigures } from './InsightFigures';
import { busiestHour, moodTotals } from './insightsModel';

type Range = InsightsReport['range'];
const RANGES: readonly Range[] = ['today', '7d', '30d', '90d'];

/**
 * Insights laid out like a report: the period picker on the right of the title, a grid of
 * figure cards two across, then one full-width card each for sales (when payments are on), top
 * dishes, busy hours and feedback mood.
 */
export function InsightsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const [range, setRange] = useState<Range>('30d');
  const report = useQuery({
    queryKey: ownerKeys.insights(venueId, range),
    queryFn: () => api.ownerGetInsights(venueId, range),
    enabled: Boolean(venueId),
  });
  const r = report.data;
  const money = (minor: number) => formatMoney(pesewas(minor), r?.currency ?? 'GHS');
  const mood = moodTotals(r?.feedbackSentimentSeries);
  const moodTotal = mood.positive + mood.neutral + mood.negative;
  const peak = r ? busiestHour(r.peakHours) : null;

  return (
    <OwnerPage
      title={t('owner.insights')}
      subtitle={t('ownerInsights.lead')}
      action={
        <View style={styles.actions}>
          {r?.sample ? <StatusPill label={t('ownerDash.sample')} tone="neutral" boxed /> : null}
          <PeriodSelect<Range>
            label={t('ownerDash.rangeLabel')}
            value={range}
            onChange={setRange}
            options={RANGES.map((id) => ({ id, label: t(`ownerInsights.range.${id}`) }))}
          />
        </View>
      }
    >
      <DeskWait
        loading={report.isLoading}
        error={report.isError}
        onRetry={() => void report.refetch()}
        skeleton={<SkeletonBlock height={260} />}
      >
        {r ? (
          <View style={styles.stack}>
            <InsightFigures report={r} peak={peak} feedback={moodTotal} />

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

            <ChartCard
              title={t('ownerInsights.topDishes')}
              empty={r.topItems.length ? undefined : t('ownerDash.noTrend')}
            >
              <RankTable
                nameHead={t('ownerInsights.dishHead')}
                valueHead={t('ownerInsights.salesHead')}
                rows={[...r.topItems]
                  .sort((a, b) => b.pesewas - a.pesewas)
                  .slice(0, 5)
                  .map((item) => ({
                    label: item.name,
                    value: money(item.pesewas),
                    detail: t('ownerInsights.sold', { count: item.count }),
                  }))}
              />
            </ChartCard>

            <ChartCard
              title={t('ownerInsights.busy')}
              rows={r.peakHours.map((h) => ({
                label: hourLabel(h.hour),
                value: t('ownerInsights.orders', { count: h.orders }),
              }))}
              empty={peak == null ? t('ownerDash.noTrend') : undefined}
            >
              <HourStrip hours={r.peakHours} summary={t('ownerInsights.busy')} />
            </ChartCard>

            <ChartCard
              title={t('ownerInsights.mood')}
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
        ) : null}
      </DeskWait>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[4] },
  actions: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
});
