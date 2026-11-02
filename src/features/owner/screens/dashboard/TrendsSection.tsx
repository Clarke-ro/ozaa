import { useState, type ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { ownerKeys } from '../../data/keys';
import { bucket, insightTiles } from '../../desk/dashboardModel';
import { BarChart, SectionLabel, Segmented, StatTile, StatusPill } from '../../kit';
import { SkeletonBlock } from '../../chrome/OwnerPage';

type Range = '7d' | '30d' | '90d';
const MAX_BARS = 7;

/** Week, month or quarter trends. Its own range control, so it never seems to change today's sales. */
export function TrendsSection({ venueId, currency }: { venueId: string; currency: string }) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const { width, fontScale } = useWindowDimensions();
  const [range, setRange] = useState<Range>('7d');
  const report = useQuery({
    queryKey: ownerKeys.insights(venueId, range),
    queryFn: () => api.ownerGetInsights(venueId, range),
    enabled: Boolean(venueId),
  });
  const r = report.data;
  const day = (iso: string) =>
    new Date(iso).toLocaleDateString(i18n.language, { weekday: 'short', day: 'numeric' });
  const tiles = insightTiles(r);
  const basis = fontScale > 1.5 ? '100%' : width >= 700 ? '31%' : '47%';

  const sales = bucket(
    (r?.series ?? []).map((p) => ({ key: p.label, value: p.pesewas })),
    MAX_BARS,
  );
  const stamps = bucket(
    (r?.loyaltySeries ?? []).map((p) => ({ key: day(p.date), value: p.stamps })),
    MAX_BARS,
  );
  const feedback = bucket(
    (r?.feedbackSentimentSeries ?? []).map((p) => ({
      key: day(p.date),
      value: p.positive + p.neutral + p.negative,
    })),
    MAX_BARS,
  );
  const money = (v: number) => formatMoney(pesewas(v), currency);
  const short = (v: number) =>
    v >= 100_000 ? `${Math.round(v / 100_000)}k` : String(Math.round(v / 100));

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <SectionLabel title={t('ownerDash.trends')} />
        {r?.sample ? <StatusPill label={t('ownerDash.sample')} tone="neutral" boxed /> : null}
      </View>
      <Segmented
        label={t('ownerDash.rangeLabel')}
        value={range}
        onChange={setRange}
        options={(['7d', '30d', '90d'] as const).map((id) => ({
          id,
          label: t(`ownerDash.range.${id}`),
        }))}
      />
      {report.isLoading ? (
        <SkeletonBlock height={200} />
      ) : !r ? null : (
        <>
          {tiles.length > 0 ? (
            <View style={styles.grid}>
              {tiles.map((tile) => (
                <View key={tile.id} style={{ flexBasis: basis, flexGrow: 1 }}>
                  <StatTile
                    label={t(`ownerDash.tiles.${tile.id}`)}
                    value={tile.value.toLocaleString(i18n.language)}
                  />
                </View>
              ))}
            </View>
          ) : null}
          <ChartCard title={t('ownerDash.salesChart')} total={money(r.salesPesewas)}>
            {sales.length ? (
              <BarChart
                bars={sales.map((b) => ({ label: b.key, value: b.value }))}
                format={short}
                summary={t('ownerDash.salesChart')}
                highlightMax
              />
            ) : null}
          </ChartCard>
          <ChartCard title={t('ownerDash.stampsChart')}>
            {stamps.some((b) => b.value > 0) ? (
              <BarChart
                bars={stamps.map((b) => ({ label: b.key, value: b.value }))}
                summary={t('ownerDash.stampsChart')}
              />
            ) : null}
          </ChartCard>
          <ChartCard title={t('ownerDash.feedbackChart')}>
            {feedback.some((b) => b.value > 0) ? (
              <BarChart
                bars={feedback.map((b) => ({ label: b.key, value: b.value }))}
                summary={t('ownerDash.feedbackChart')}
              />
            ) : null}
          </ChartCard>
        </>
      )}
      {report.isError ? (
        <Text variant="body" style={{ color: theme.muted }}>
          {t('ownerKit.loadFailed')}
        </Text>
      ) : null}
    </View>
  );
}

function ChartCard({
  title,
  total,
  children,
}: {
  title: string;
  total?: string;
  children: ReactNode;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <View style={[styles.card, { borderColor: theme.line, backgroundColor: theme.surface }]}>
      <View style={styles.cardHead}>
        <Text variant="body-strong" accessibilityRole="header" style={styles.flex}>
          {title}
        </Text>
        {total ? <Text variant="title">{total}</Text> : null}
      </View>
      {children ?? (
        <Text variant="body" style={{ color: theme.muted }}>
          {t('ownerDash.noTrend')}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.space[3] },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[3] },
  card: {
    gap: tokens.space[4],
    padding: tokens.space[4],
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
  },
  cardHead: { flexDirection: 'row', alignItems: 'baseline', gap: tokens.space[2] },
  flex: { flex: 1 },
});
