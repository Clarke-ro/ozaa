import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { useOwnerLayout } from '../../chrome/layout';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { ownerKeys } from '../../data/keys';
import { formatWhen } from '../../desk/noticeForm';
import { ORDER_RANGES, orderRange, type OrderRange } from '../../desk/orderRange';
import { previousOrderRange } from '../../desk/salesCompare';
import { PeriodSelect } from '../../kit';
import { BySource, HowPaid, StatusMix, TopDishes } from './SalesCards';
import { SalesFigures } from './SalesFigures';
import { SalesTrend } from './SalesTrend';

// Only a safety net while the venue loads; every venue has a zone in its opening hours.
const FALLBACK_ZONE = 'Africa/Accra';
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Sales as an analytics page: the period picker on the right of the title, figure cards that
 * compare with the period just before, order value as a line over every day of the period, then
 * the breakdowns two by two on wide screens (top dishes and how it was paid, where orders came
 * from and how they ended up).
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
  const before = previousOrderRange(range, openedAt, zone);
  const sales = useQuery({
    queryKey: [...ownerKeys.sales(venueId), range],
    queryFn: () => api.ownerGetSales(venueId, filter),
    enabled: Boolean(venueId),
  });
  const previous = useQuery({
    queryKey: [...ownerKeys.sales(venueId), range, 'previous'],
    queryFn: () => api.ownerGetSales(venueId, before ?? {}),
    enabled: Boolean(venueId) && before !== null,
  });
  const r = sales.data;
  // The chart's first and last day in the venue's calendar; the last is today unless the range
  // ends earlier (yesterday ends at today's midnight).
  const day = (iso: string) => formatWhen(iso, zone).slice(0, 10);
  const from = filter.since ? day(filter.since) : null;
  const to = filter.since
    ? day(
        filter.until
          ? new Date(Date.parse(filter.until) - DAY_MS).toISOString()
          : new Date(openedAt).toISOString(),
      )
    : null;

  const pair = (a: ReactNode, b: ReactNode) => (
    <View style={[styles.pair, wide && styles.row]}>
      <View style={wide ? styles.flex : undefined}>{a}</View>
      <View style={wide ? styles.flex : undefined}>{b}</View>
    </View>
  );

  return (
    <OwnerPage
      width="wide"
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
            <SalesFigures
              report={r}
              previous={previous.data ?? null}
              vsLabel={t(`ownerSales.vs.${range}`)}
              wide={wide}
            />
            <SalesTrend report={r} from={from} to={to} />
            {pair(<TopDishes report={r} />, <HowPaid report={r} />)}
            {pair(<BySource report={r} />, <StatusMix report={r} />)}
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
});
