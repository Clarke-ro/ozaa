import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Banknote,
  Bike,
  Clock,
  Globe,
  Store,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react-native';
import { api } from '@/lib/api';
import type { OrderSource, SalesReport } from '@/lib/api/types';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { useTheme } from '@/ui/theme';
import { useOwnerLayout } from '../../chrome/layout';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { ownerKeys } from '../../data/keys';
import { ORDER_RANGES, orderRange, type OrderRange } from '../../desk/orderRange';
import { BarChart, ChartCard, PeriodSelect, RankTable, SplitBar } from '../../kit';
import { SalesFigures } from './SalesFigures';

// Only a safety net while the venue loads; every venue has a zone in its opening hours.
const FALLBACK_ZONE = 'Africa/Accra';
const SOURCE_ICON: Record<OrderSource, LucideIcon> = {
  table: UtensilsCrossed,
  pickup: Store,
  delivery: Bike,
};

/**
 * What was ordered over a date range, laid out like a sales report: the period picker on the
 * right of the title, a grid of figure cards (order value twice as wide), then the top dishes
 * next to how it was paid, the order value by day, and where orders came from.
 */
export function SalesScreen() {
  const { t } = useTranslation();
  const { wide } = useOwnerLayout();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const [range, setRange] = useState<OrderRange>('30d');
  const venue = useQuery({
    queryKey: ownerKeys.venue(venueId),
    queryFn: () => api.ownerGetVenue(venueId),
    enabled: Boolean(venueId),
  });
  const zone = venue.data?.hours.timezone ?? FALLBACK_ZONE;
  // The moment the page opened: day boundaries only move at midnight, and reopening refreshes it.
  const [openedAt] = useState(() => Date.now());
  const filter = orderRange(range, openedAt, zone);
  const sales = useQuery({
    queryKey: [...ownerKeys.sales(venueId), range],
    queryFn: () => api.ownerGetSales(venueId, filter),
    enabled: Boolean(venueId),
  });
  const r = sales.data;

  return (
    <OwnerPage
      title={t('owner.sales')}
      subtitle={t('ownerSales.lead')}
      action={
        <PeriodSelect<OrderRange>
          label={t('ownerOrders.range.label')}
          value={range}
          onChange={setRange}
          options={ORDER_RANGES.map((id) => ({ id, label: t(`ownerOrders.range.${id}`) }))}
        />
      }
    >
      <DeskWait
        loading={sales.isLoading}
        error={sales.isError}
        onRetry={() => void sales.refetch()}
      >
        {r ? (
          <View style={styles.stack}>
            <SalesFigures report={r} wide={wide} />
            <View style={[styles.pair, wide && styles.row]}>
              <View style={wide ? styles.flex : undefined}>
                <TopDishes report={r} />
              </View>
              <View style={wide ? styles.flex : undefined}>
                <HowPaid report={r} />
              </View>
            </View>
            <ByDay report={r} />
            <BySource report={r} />
          </View>
        ) : null}
      </DeskWait>
    </OwnerPage>
  );
}

function useMoney(r: SalesReport) {
  return (amount: number) => formatMoney(pesewas(amount), r.currency);
}

function TopDishes({ report: r }: { report: SalesReport }) {
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
          detail: t('ownerInsights.sold', { count: item.count }),
        }))}
      />
    </ChartCard>
  );
}

function HowPaid({ report: r }: { report: SalesReport }) {
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

function ByDay({ report: r }: { report: SalesReport }) {
  const { t } = useTranslation();
  const money = useMoney(r);
  return (
    <ChartCard
      title={t('ownerSales.overTime')}
      figure={money(r.valuePesewas)}
      rows={r.days.map((day) => ({ label: day.date, value: money(day.pesewas) }))}
      empty={r.days.length ? undefined : t('ownerSales.empty')}
    >
      <BarChart
        bars={r.days.map((day) => ({ label: day.date.slice(5), value: day.pesewas }))}
        format={money}
        summary={t('ownerSales.overTimeSummary')}
      />
    </ChartCard>
  );
}

function BySource({ report: r }: { report: SalesReport }) {
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

const styles = StyleSheet.create({
  stack: { gap: tokens.space[4] },
  pair: { gap: tokens.space[4] },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  flex: { flex: 1, minWidth: 0 },
});
