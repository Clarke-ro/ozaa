import { useTranslation } from 'react-i18next';
import {
  Ban,
  Banknote,
  Bike,
  CircleCheck,
  Clock,
  Globe,
  Hourglass,
  Store,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react-native';
import type { OrderSource, SalesReport } from '@/lib/api/types';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { useTheme } from '@/ui/theme';
import { ChartCard, RankTable, SplitBar } from '../../kit';

const SOURCE_ICON: Record<OrderSource, LucideIcon> = {
  table: UtensilsCrossed,
  pickup: Store,
  delivery: Bike,
};

function useMoney(r: SalesReport) {
  return (amount: number) => formatMoney(pesewas(amount), r.currency);
}

/** The five best sellers by order value, each with how many sold and its share of the total. */
export function TopDishes({ report: r }: { report: SalesReport }) {
  const { t } = useTranslation();
  const money = useMoney(r);
  return (
    <ChartCard
      title={t('ownerSales.topItems')}
      empty={r.topItems.length ? undefined : t('ownerSales.empty')}
    >
      <RankTable
        nameHead={t('ownerSales.dishHead')}
        valueHead={t('ownerSales.valueHead')}
        rows={r.topItems.slice(0, 5).map((item) => ({
          label: item.name,
          value: money(item.pesewas),
          detail:
            r.valuePesewas > 0
              ? t('ownerSales.soldShare', {
                  count: item.count,
                  percent: Math.round((item.pesewas / r.valuePesewas) * 100),
                })
              : t('ownerInsights.sold', { count: item.count }),
        }))}
      />
    </ChartCard>
  );
}

/** Order value split into paid online, paid in person and not paid yet. */
export function HowPaid({ report: r }: { report: SalesReport }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const money = useMoney(r);
  return (
    <ChartCard
      title={t('ownerSales.paid')}
      rows={[
        { label: t('ownerSales.paidOnline'), value: money(r.payments.onlinePesewas) },
        { label: t('ownerSales.paidInPerson'), value: money(r.payments.inPersonPesewas) },
        { label: t('ownerSales.unpaid'), value: money(r.payments.unpaidPesewas) },
      ]}
      empty={r.orderCount ? undefined : t('ownerSales.empty')}
    >
      <SplitBar
        showCount={false}
        summary={t('ownerSales.paid')}
        parts={[
          {
            label: t('ownerSales.paidOnline'),
            amount: r.payments.onlinePesewas,
            color: theme.success,
            icon: Globe,
          },
          {
            label: t('ownerSales.paidInPerson'),
            amount: r.payments.inPersonPesewas,
            color: theme.fill,
            icon: Banknote,
          },
          {
            label: t('ownerSales.unpaid'),
            amount: r.payments.unpaidPesewas,
            color: theme.line,
            icon: Clock,
          },
        ]}
      />
    </ChartCard>
  );
}

/** Orders by where they came from: tables, pickup and delivery. */
export function BySource({ report: r }: { report: SalesReport }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const money = useMoney(r);
  const color: Record<OrderSource, string> = {
    table: theme.fill,
    pickup: theme.meta,
    delivery: theme.line,
  };
  return (
    <ChartCard
      title={t('ownerSales.bySource')}
      caption={
        r.deliveryFeesPesewas > 0
          ? t('ownerSales.deliveryFees', { amount: money(r.deliveryFeesPesewas) })
          : undefined
      }
      rows={r.bySource.map((row) => ({
        label: t(`ownerOrders.source.${row.source}`),
        value: `${money(row.pesewas)} · ${t('ownerSales.orders', { count: row.orders })}`,
      }))}
      empty={r.bySource.length ? undefined : t('ownerSales.empty')}
    >
      {/* Shares only here; exact money is under Numbers (the bar would show raw pesewas). */}
      <SplitBar
        showCount={false}
        summary={t('ownerSales.bySource')}
        parts={r.bySource.map((row) => ({
          label: t(`ownerOrders.source.${row.source}`),
          amount: row.pesewas,
          color: color[row.source],
          icon: SOURCE_ICON[row.source],
        }))}
      />
    </ChartCard>
  );
}

/** How the period's orders ended up: completed, still in progress, or cancelled. */
export function StatusMix({ report: r }: { report: SalesReport }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const s = r.byStatus;
  const inProgress = s.received + s.preparing + s.ready;
  const total = s.served + inProgress + s.cancelled;
  return (
    <ChartCard
      title={t('ownerSales.statusMix')}
      rows={[
        { label: t('ownerSales.stats.completed'), value: String(s.served) },
        { label: t('ownerSales.stats.inProgress'), value: String(inProgress) },
        { label: t('ownerSales.stats.cancelled'), value: String(s.cancelled) },
      ]}
      empty={total ? undefined : t('ownerSales.empty')}
    >
      <SplitBar
        summary={t('ownerSales.statusMix')}
        parts={[
          {
            label: t('ownerSales.stats.completed'),
            amount: s.served,
            color: theme.success,
            icon: CircleCheck,
          },
          {
            label: t('ownerSales.stats.inProgress'),
            amount: inProgress,
            color: theme.fill,
            icon: Hourglass,
          },
          {
            label: t('ownerSales.stats.cancelled'),
            amount: s.cancelled,
            color: theme.error,
            icon: Ban,
          },
        ]}
      />
    </ChartCard>
  );
}
