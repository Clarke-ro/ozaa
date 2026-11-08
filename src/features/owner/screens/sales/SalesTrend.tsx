import { useTranslation } from 'react-i18next';
import type { SalesReport } from '@/lib/api/types';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { fillDays } from '../../desk/salesCompare';
import { AreaChart, ChartCard } from '../../kit';
import { shortMoney } from '../insights/insightsModel';

/**
 * Order value day by day as a line, with every day in the period shown (quiet days at zero),
 * the period's total as the headline, and the exact numbers under "Numbers".
 */
export function SalesTrend({
  report: r,
  from,
  to,
}: {
  report: SalesReport;
  /** First and last day of the period (YYYY-MM-DD, venue time); null for all time. */
  from: string | null;
  to: string | null;
}) {
  const { t, i18n } = useTranslation();
  const money = (amount: number) => formatMoney(pesewas(amount), r.currency);
  const days = fillDays(r.days, from, to);
  const label = (date: string) =>
    new Date(`${date}T12:00:00Z`).toLocaleDateString(i18n.language, {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    });

  return (
    <ChartCard
      title={t('ownerSales.overTime')}
      figure={money(r.valuePesewas)}
      rows={days.map((day) => ({ label: label(day.date), value: money(day.pesewas) }))}
      empty={r.orderCount ? undefined : t('ownerSales.empty')}
    >
      <AreaChart
        points={days.map((day) => ({ label: label(day.date), value: day.pesewas }))}
        format={money}
        axis={(v) => shortMoney(v, r.currency)}
        summary={t('ownerSales.overTimeSummary')}
      />
    </ChartCard>
  );
}
