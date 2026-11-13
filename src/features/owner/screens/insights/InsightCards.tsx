import { useTranslation } from 'react-i18next';
import type { InsightsReport } from '@/lib/api/types';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { AreaChart, ChartCard } from '../../kit';
import { shortMoney } from './insightsModel';

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
