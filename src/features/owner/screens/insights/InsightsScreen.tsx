import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import type { InsightsReport } from '@/lib/api/types';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { useOwnerLayout } from '../../chrome/layout';
import { DeskWait, OwnerPage, SkeletonBlock } from '../../chrome/OwnerPage';
import { ownerKeys } from '../../data/keys';
import { Field, PeriodSelect, StatusPill } from '../../kit';
import {
  BusyHours,
  Funnel,
  GuestsSplit,
  MoodSplit,
  SalesLine,
  TopDishesTable,
  VisitsByHour,
} from './InsightCards';
import { InsightFigures } from './InsightFigures';
import { busiestHour } from './insightsModel';

type Range = InsightsReport['range'];
const RANGES: readonly Range[] = ['today', '7d', '30d', '90d', 'custom'];
const DAY_MS = 86_400_000;
const isDay = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

/**
 * Insights as an analytics page: the period picker on the right of the title, the headline
 * figures (four across on wide screens), sales as a line, then the
 * breakdowns two by two on wide screens: top dishes and busy hours, returning guests and
 * and feedback mood, with the scan-to-order funnel and visits by hour on top.
 */
export function InsightsScreen() {
  const { t } = useTranslation();
  const { wide } = useOwnerLayout();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const [range, setRange] = useState<Range>('30d');
  // Custom dates are typed as YYYY-MM-DD; the end day is included, so the window runs to the next midnight.
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const customOk = isDay(from) && isDay(to) && from <= to;
  const window =
    range === 'custom' && customOk
      ? {
          since: new Date(from).toISOString(),
          until: new Date(Date.parse(to) + DAY_MS).toISOString(),
        }
      : undefined;
  const report = useQuery({
    queryKey: [...ownerKeys.insights(venueId, range), from, to],
    queryFn: () => api.ownerGetInsights(venueId, range, window),
    enabled: Boolean(venueId) && (range !== 'custom' || customOk),
  });
  const r = report.data;
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
      {range === 'custom' ? (
        <View style={styles.dates}>
          <Field
            label={t('ownerInsights.from')}
            placeholder="2026-11-01"
            value={from}
            onChangeText={setFrom}
          />
          <Field
            label={t('ownerInsights.to')}
            placeholder="2026-11-12"
            value={to}
            onChangeText={setTo}
          />
        </View>
      ) : null}
      <DeskWait
        loading={report.isLoading && (range !== 'custom' || customOk)}
        error={report.isError}
        onRetry={() => void report.refetch()}
        skeleton={<SkeletonBlock height={260} />}
      >
        {r ? (
          <View style={styles.stack}>
            <InsightFigures
              report={r}
              peak={peak}
              columns={wide ? 4 : 2}
            />
            {pair(<Funnel report={r} />, <VisitsByHour report={r} />)}
            <SalesLine report={r} />
            {pair(<TopDishesTable report={r} />, <BusyHours report={r} />)}
            {pair(<GuestsSplit report={r} />, <MoodSplit report={r} />)}
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
  dates: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[3] },
  actions: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
});
