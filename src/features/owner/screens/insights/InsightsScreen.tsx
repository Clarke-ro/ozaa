import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { useOwnerLayout } from '../../chrome/layout';
import { DeskWait, OwnerPage, SkeletonBlock } from '../../chrome/OwnerPage';
import { ownerKeys } from '../../data/keys';
import { SALES_RANGES, salesRange, type SalesRangeId } from '../../desk/salesRange';
import { ChipRow, Field, StatusPill } from '../../kit';
import { SalesLine } from './InsightCards';
import { FunnelCard } from './FunnelCard';
import { ReturningCard, WhenCard } from './GuestCards';
import { MoodList, TopDishesList } from './InsightLists';

// Only a safety net while the venue loads; every venue has a zone in its opening hours.
const FALLBACK_ZONE = 'Africa/Accra';
const isDay = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

/**
 * Insights as on the design canvas: the same date chips as Sales, then "From scan to order",
 * the dishes ordered most beside returning guests, when guests come beside their mood, and sales
 * over the period. Each section is a title above a white card.
 */
export function InsightsScreen() {
  const { t } = useTranslation();
  const { wide } = useOwnerLayout();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const [range, setRange] = useState<SalesRangeId>('30d');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const customOk = isDay(from) && isDay(to) && from <= to;
  const venue = useQuery({
    queryKey: ownerKeys.venue(venueId),
    queryFn: () => api.ownerGetVenue(venueId),
    enabled: Boolean(venueId),
  });
  const zone = venue.data?.hours.timezone ?? FALLBACK_ZONE;
  const [openedAt] = useState(() => Date.now());
  // The report has its own names for today and 30 days; every other chip asks for its exact
  // window as "custom", worked out in the venue's time zone like Sales.
  const apiRange = range === 'today' || range === '30d' ? range : 'custom';
  const span = salesRange({ id: range, from, to }, openedAt, zone);
  // Open-ended ranges (this week, this month) run until now.
  const window =
    apiRange === 'custom' && span.since
      ? { since: span.since, until: span.until ?? new Date(openedAt).toISOString() }
      : undefined;
  const ready = Boolean(venueId) && (range !== 'custom' || customOk);
  const report = useQuery({
    queryKey: [...ownerKeys.insights(venueId, apiRange), range, from, to],
    queryFn: () => api.ownerGetInsights(venueId, apiRange, window),
    enabled: ready,
  });
  const r = report.data;

  const pair = (a: (style: object) => ReactNode, b: (style: object) => ReactNode) => (
    <View style={[styles.pair, wide && styles.row]}>
      {a(wide ? styles.wideA : {})}
      {b(wide ? styles.flex : {})}
    </View>
  );

  return (
    <OwnerPage
      width="mid"
      title={t('owner.insights')}
      subtitle={t('ownerInsights.lead')}
      action={
        r?.sample ? <StatusPill label={t('ownerDash.sample')} tone="neutral" boxed /> : undefined
      }
    >
      <ChipRow<SalesRangeId>
        label={t('ownerDash.rangeLabel')}
        value={range}
        onChange={setRange}
        items={[...SALES_RANGES, 'custom' as const].map((id) => ({
          id,
          label: t(`ownerSales.range.${id}`),
        }))}
      />
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
        loading={report.isLoading && ready}
        error={report.isError}
        onRetry={() => void report.refetch()}
        skeleton={<SkeletonBlock height={260} />}
      >
        {r ? (
          <View style={styles.stack}>
            <FunnelCard report={r} />
            {pair(
              (s) => (
                <TopDishesList report={r} style={s} />
              ),
              (s) => (
                <ReturningCard report={r} style={s} />
              ),
            )}
            {pair(
              (s) => (
                <WhenCard report={r} style={s} />
              ),
              (s) => (
                <MoodList report={r} style={s} />
              ),
            )}
            <SalesLine report={r} />
          </View>
        ) : null}
      </DeskWait>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  // Canvas: 56 px between sections; side-by-side sections 24 px apart, the left one wider.
  stack: { gap: tokens.owner.controls.todayGap },
  pair: { gap: tokens.owner.controls.todayGap },
  row: { flexDirection: 'row', alignItems: 'stretch', gap: tokens.space[6] },
  wideA: { flex: 1.5 },
  flex: { flex: 1 },
  dates: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[3] },
});
