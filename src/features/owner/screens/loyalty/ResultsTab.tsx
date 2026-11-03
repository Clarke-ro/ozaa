import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Gift, Stamp, UserPlus, Users } from 'lucide-react-native';
import { api } from '@/lib/api';
import { tokens } from '@/theme/tokens';
import { DeskWait, SkeletonBlock } from '../../chrome/OwnerPage';
import { bucket } from '../../desk/dashboardModel';
import { BarChart, ChartCard, Segmented, StatTile } from '../../kit';

type Range = '7d' | '30d' | '90d';
const MAX_BARS = 7;

/** How the loyalty programme is doing: four headline numbers and two trends. */
export function ResultsTab({ venueId }: { venueId: string }) {
  const { t, i18n } = useTranslation();
  const [range, setRange] = useState<Range>('30d');
  const report = useQuery({
    queryKey: ['owner-loyalty-analytics', venueId, range],
    queryFn: () => api.ownerGetLoyaltyAnalytics(venueId, range),
    enabled: Boolean(venueId),
  });
  const r = report.data;
  const day = (iso: string) =>
    new Date(iso).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' });
  const series = (pick: 'stampsIssued' | 'newEnrollments') =>
    bucket(
      (r?.series ?? []).map((p) => ({ key: day(p.date), value: p[pick] })),
      MAX_BARS,
    ).map((b) => ({ label: b.key, value: b.value }));
  const stamps = series('stampsIssued');
  const joins = series('newEnrollments');
  const n = (v: number) => v.toLocaleString(i18n.language);

  return (
    <View style={styles.stack}>
      <Segmented<Range>
        label={t('ownerDash.rangeLabel')}
        value={range}
        onChange={setRange}
        options={(['7d', '30d', '90d'] as const).map((id) => ({
          id,
          label: t(`ownerDash.range.${id}`),
        }))}
      />
      <DeskWait
        loading={report.isLoading}
        error={report.isError}
        onRetry={() => void report.refetch()}
        skeleton={<SkeletonBlock height={220} />}
      >
        {r ? (
          <View style={styles.stack}>
            <View style={styles.grid}>
              <View style={styles.half}>
                <StatTile
                  label={t('ownerLoyaltyResults.members')}
                  value={n(r.enrolledCount)}
                  icon={Users}
                />
              </View>
              <View style={styles.half}>
                <StatTile
                  label={t('ownerLoyaltyResults.joined')}
                  value={n(r.newEnrollments)}
                  icon={UserPlus}
                />
              </View>
              <View style={styles.half}>
                <StatTile
                  label={t('ownerLoyaltyResults.stamps')}
                  value={n(r.stampsIssued)}
                  icon={Stamp}
                />
              </View>
              <View style={styles.half}>
                <StatTile
                  label={t('ownerLoyaltyResults.redeemed')}
                  value={n(r.rewardsRedeemed)}
                  icon={Gift}
                />
              </View>
            </View>
            <ChartCard
              title={t('ownerLoyaltyResults.stampsTrend')}
              rows={stamps.map((b) => ({ label: b.label, value: n(b.value) }))}
              empty={stamps.some((b) => b.value > 0) ? undefined : t('ownerDash.noTrend')}
            >
              <BarChart
                bars={stamps}
                format={n}
                summary={t('ownerLoyaltyResults.stampsTrend')}
                height={110}
              />
            </ChartCard>
            <ChartCard
              title={t('ownerLoyaltyResults.joinedTrend')}
              rows={joins.map((b) => ({ label: b.label, value: n(b.value) }))}
              empty={joins.some((b) => b.value > 0) ? undefined : t('ownerDash.noTrend')}
            >
              <BarChart
                bars={joins}
                format={n}
                summary={t('ownerLoyaltyResults.joinedTrend')}
                height={110}
              />
            </ChartCard>
          </View>
        ) : null}
      </DeskWait>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[4] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[3] },
  half: { flexBasis: '47%', flexGrow: 1 },
});
