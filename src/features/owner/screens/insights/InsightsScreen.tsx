import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import type { InsightsReport } from '@/lib/api/types';
import { PAYMENTS_ENABLED } from '@/lib/features';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { useOwnerLayout } from '../../chrome/layout';
import { DeskWait, OwnerPage, SkeletonBlock } from '../../chrome/OwnerPage';
import { ownerKeys } from '../../data/keys';
import { PeriodSelect, StatusPill } from '../../kit';
import {
  BusyHours,
  GuestsSplit,
  MoodSplit,
  SalesLine,
  StampsLine,
  TopDishesTable,
} from './InsightCards';
import { InsightFigures } from './InsightFigures';
import { busiestHour, moodTotals } from './insightsModel';

type Range = InsightsReport['range'];
const RANGES: readonly Range[] = ['today', '7d', '30d', '90d'];

/**
 * Insights as an analytics page: the period picker on the right of the title, the headline
 * figures (four across on wide screens), sales as a line when payments are on, then the
 * breakdowns two by two on wide screens: top dishes and busy hours, returning guests and
 * feedback mood, and loyalty stamps over time.
 */
export function InsightsScreen() {
  const { t } = useTranslation();
  const { wide } = useOwnerLayout();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const [range, setRange] = useState<Range>('30d');
  const report = useQuery({
    queryKey: ownerKeys.insights(venueId, range),
    queryFn: () => api.ownerGetInsights(venueId, range),
    enabled: Boolean(venueId),
  });
  const r = report.data;
  const mood = moodTotals(r?.feedbackSentimentSeries);
  const peak = r ? busiestHour(r.peakHours) : null;

  const pair = (a: ReactNode, b: ReactNode) => (
    <View style={[styles.pair, wide && styles.row]}>
      <View style={wide ? styles.flex : undefined}>{a}</View>
      <View style={wide ? styles.flex : undefined}>{b}</View>
    </View>
  );

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
            <InsightFigures
              report={r}
              peak={peak}
              feedback={mood.positive + mood.neutral + mood.negative}
              columns={wide ? 4 : 2}
            />
            {PAYMENTS_ENABLED ? <SalesLine report={r} /> : null}
            {pair(<TopDishesTable report={r} />, <BusyHours report={r} />)}
            {pair(<GuestsSplit report={r} />, <MoodSplit report={r} />)}
            <StampsLine report={r} />
          </View>
        ) : null}
      </DeskWait>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[4] },
  pair: { gap: tokens.space[4] },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  flex: { flex: 1, minWidth: 0 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
});
