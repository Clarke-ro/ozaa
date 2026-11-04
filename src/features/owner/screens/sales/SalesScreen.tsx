import { useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Ban,
  Bike,
  CircleCheck,
  ClipboardList,
  Hourglass,
  Store,
  TicketPercent,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';
import { api } from '@/lib/api';
import type { OrderSource } from '@/lib/api/types';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { useOwnerSession } from '@/features/session';
import { FilterChips } from '@/ui/FilterChips';
import { tokens } from '@/theme/tokens';
import { useTheme } from '@/ui/theme';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { ownerKeys } from '../../data/keys';
import { ORDER_RANGES, orderRange, type OrderRange } from '../../desk/orderRange';
import { BarChart, ChartCard, RankBars, SplitBar, StatTile } from '../../kit';

// Only a safety net while the venue loads; every venue has a zone in its opening hours.
const FALLBACK_ZONE = 'Africa/Accra';
const SOURCE_ICON: Record<OrderSource, LucideIcon> = {
  table: UtensilsCrossed,
  pickup: Store,
  delivery: Bike,
};

/** What was ordered over a date range: money, counts by status, discounts, sources and top dishes. */
export function SalesScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { width, fontScale } = useWindowDimensions();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const [range, setRange] = useState<OrderRange>('7d');
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
  const money = (amount: number) => formatMoney(pesewas(amount), r?.currency);
  const basis = fontScale > 1.5 ? '100%' : width >= 700 ? '31%' : '47%';
  const sourceColor: Record<OrderSource, string> = {
    table: theme.fill,
    pickup: theme.meta,
    delivery: theme.line,
  };

  return (
    <OwnerPage title={t('owner.sales')} subtitle={t('ownerSales.lead')}>
      <FilterChips<OrderRange>
        label={t('ownerOrders.range.label')}
        value={range}
        onChange={setRange}
        items={ORDER_RANGES.map((id) => ({ id, label: t(`ownerOrders.range.${id}`) }))}
      />
      <DeskWait
        loading={sales.isLoading}
        error={sales.isError}
        onRetry={() => void sales.refetch()}
      >
        {r ? (
          <View style={styles.stack}>
            <View style={styles.grid}>
              {(
                [
                  ['value', money(r.valuePesewas), t('ownerSales.notes.value'), Wallet],
                  ['orders', String(r.orderCount), t('ownerSales.notes.orders'), ClipboardList],
                  [
                    'completed',
                    String(r.byStatus.served),
                    t('ownerSales.notes.completed'),
                    CircleCheck,
                  ],
                  [
                    'inProgress',
                    String(r.byStatus.received + r.byStatus.preparing + r.byStatus.ready),
                    t('ownerSales.notes.inProgress'),
                    Hourglass,
                  ],
                  ['cancelled', String(r.byStatus.cancelled), t('ownerSales.notes.cancelled'), Ban],
                  [
                    'discounts',
                    money(r.discountsPesewas),
                    t('ownerSales.notes.discounts'),
                    TicketPercent,
                  ],
                ] as const
              ).map(([key, value, note, icon]) => (
                <View key={key} style={{ flexBasis: basis, flexGrow: 1 }}>
                  <StatTile
                    label={t(`ownerSales.stats.${key}`)}
                    value={value}
                    note={note}
                    icon={icon}
                  />
                </View>
              ))}
            </View>

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

            <ChartCard
              title={t('ownerSales.bySource')}
              caption={
                r.deliveryFeesPesewas > 0
                  ? t('ownerSales.deliveryFees', { amount: money(r.deliveryFeesPesewas) })
                  : undefined
              }
              rows={r.bySource.map((row) => ({
                label: t(`ownerOrders.source.${row.source === 'table' ? 'table' : row.source}`),
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
                  color: sourceColor[row.source],
                  icon: SOURCE_ICON[row.source],
                }))}
              />
            </ChartCard>

            <ChartCard
              title={t('ownerSales.topItems')}
              rows={r.topItems.map((item) => ({ label: item.name, value: money(item.pesewas) }))}
              empty={r.topItems.length ? undefined : t('ownerSales.empty')}
            >
              <RankBars
                items={r.topItems.map((item) => ({
                  label: item.name,
                  value: item.pesewas,
                  detail: t('ownerInsights.sold', { count: item.count }),
                }))}
                format={money}
              />
            </ChartCard>
          </View>
        ) : null}
      </DeskWait>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[4] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[3] },
});
