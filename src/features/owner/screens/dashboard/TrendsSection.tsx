import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { tokens } from '@/theme/tokens';
import { SkeletonBlock } from '../../chrome/OwnerPage';
import { ownerKeys } from '../../data/keys';
import { BarChart, ChartCard, SectionLabel } from '../../kit';

/** The last seven days of sales. The full picture lives on Insights, one tap away. */
export function TrendsSection({ venueId, currency }: { venueId: string; currency: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const report = useQuery({
    queryKey: ownerKeys.insights(venueId, '7d'),
    queryFn: () => api.ownerGetInsights(venueId, '7d'),
    enabled: Boolean(venueId),
  });
  const r = report.data;
  const money = (v: number) => formatMoney(pesewas(v), currency);
  return (
    <View style={styles.wrap}>
      <SectionLabel
        title={t('ownerDash.week')}
        action={t('ownerDash.allInsights')}
        onAction={() => router.push('/owner/insights')}
      />
      {report.isLoading ? (
        <SkeletonBlock height={220} />
      ) : r ? (
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
            height={110}
          />
        </ChartCard>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { gap: tokens.space[2] } });
