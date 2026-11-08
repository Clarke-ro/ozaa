import { useTranslation } from 'react-i18next';
import { Frown, Meh, Smile } from 'lucide-react-native';
import type { InsightsReport } from '@/lib/api/types';
import { pesewas } from '@/lib/brand';
import { PAYMENTS_ENABLED } from '@/lib/features';
import { formatMoney } from '@/lib/money';
import { useTheme } from '@/ui/theme';
import { AreaChart, BarChart, ChartCard, hourLabel, RankTable, SplitBar } from '../../kit';
import { moodTotals, shortMoney } from './insightsModel';

type Props = { report: InsightsReport };

/** Sales over the period as a line. Only shown when the app takes payments. */
export function SalesLine({ report: r }: Props) {
  const { t } = useTranslation();
  const money = (minor: number) => formatMoney(pesewas(minor), r.currency);
  return (
    <ChartCard
      title={t('ownerInsights.sales')}
      figure={money(r.salesPesewas)}
      rows={r.series.map((p) => ({ label: p.label, value: money(p.pesewas) }))}
      empty={r.series.length ? undefined : t('ownerDash.noTrend')}
    >
      <AreaChart
        points={r.series.map((p) => ({ label: p.label, value: p.pesewas }))}
        format={money}
        axis={(v) => shortMoney(v, r.currency)}
        summary={t('ownerInsights.sales')}
      />
    </ChartCard>
  );
}

/**
 * The five best sellers as a table, each with its share of everything sold. With payments off
 * they rank by how many sold, which comes from orders, not from money taken.
 */
export function TopDishesTable({ report: r }: Props) {
  const { t, i18n } = useTranslation();
  const money = (minor: number) => formatMoney(pesewas(minor), r.currency);
  const sold = r.topItems.reduce((sum, item) => sum + item.count, 0);
  const rows = [...r.topItems]
    .sort((a, b) => (PAYMENTS_ENABLED ? b.pesewas - a.pesewas : b.count - a.count))
    .slice(0, 5)
    .map((item) => {
      const share = sold > 0 ? Math.round((item.count / sold) * 100) : 0;
      return PAYMENTS_ENABLED
        ? {
            label: item.name,
            value: money(item.pesewas),
            detail: t('ownerInsights.soldShare', { count: item.count, percent: share }),
          }
        : {
            label: item.name,
            value: item.count.toLocaleString(i18n.language),
            detail: t('ownerInsights.share', { percent: share }),
          };
    });
  return (
    <ChartCard
      title={t('ownerInsights.topDishes')}
      empty={r.topItems.length ? undefined : t('ownerDash.noTrend')}
    >
      <RankTable
        nameHead={t('ownerInsights.dishHead')}
        valueHead={t(PAYMENTS_ENABLED ? 'ownerInsights.salesHead' : 'ownerInsights.soldHead')}
        rows={rows}
      />
    </ChartCard>
  );
}

/** Orders by hour of the day as bars, the busiest named. */
export function BusyHours({ report: r }: Props) {
  const { t } = useTranslation();
  return (
    <ChartCard
      title={t('ownerInsights.busy')}
      rows={r.peakHours.map((h) => ({
        label: hourLabel(h.hour),
        value: t('ownerInsights.orders', { count: h.orders }),
      }))}
      empty={r.peakHours.some((h) => h.orders > 0) ? undefined : t('ownerDash.noTrend')}
    >
      <BarChart
        bars={r.peakHours.map((h) => ({ label: hourLabel(h.hour), value: h.orders }))}
        format={(v) => t('ownerInsights.orders', { count: v })}
        summary={t('ownerInsights.busy')}
      />
    </ChartCard>
  );
}

/** First visits against returning guests. */
export function GuestsSplit({ report: r }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const share = r.repeatGuests.sharePercent;
  return (
    <ChartCard
      title={t('ownerInsights.guests')}
      figure={`${share}%`}
      caption={t('ownerInsights.returning', { count: r.repeatGuests.count })}
    >
      <SplitBar
        showCount={false}
        summary={t('ownerInsights.guests')}
        parts={[
          { label: t('ownerInsights.returningShort'), amount: share, color: theme.fill },
          { label: t('ownerInsights.firstVisit'), amount: 100 - share, color: theme.line },
        ]}
      />
    </ChartCard>
  );
}

/** How guests felt in their notes: happy, neutral or unhappy. */
export function MoodSplit({ report: r }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const mood = moodTotals(r.feedbackSentimentSeries);
  const total = mood.positive + mood.neutral + mood.negative;
  return (
    <ChartCard title={t('ownerInsights.mood')} empty={total ? undefined : t('ownerDash.noTrend')}>
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
  );
}

/** Loyalty stamps given per day, when the server sends the series. */
export function StampsLine({ report: r }: Props) {
  const { t, i18n } = useTranslation();
  const series = r.loyaltySeries ?? [];
  if (series.length === 0) return null;
  const total = series.reduce((sum, d) => sum + d.stamps, 0);
  const n = (v: number) => v.toLocaleString(i18n.language);
  return (
    <ChartCard
      title={t('ownerDash.stampsChart')}
      figure={n(total)}
      rows={series.map((d) => ({ label: d.date, value: n(d.stamps) }))}
    >
      <AreaChart
        points={series.map((d) => ({ label: d.date.slice(5), value: d.stamps }))}
        format={n}
        summary={t('ownerDash.stampsChart')}
      />
    </ChartCard>
  );
}
