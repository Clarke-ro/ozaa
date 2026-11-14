import { useState } from 'react';
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
import {
  previousSalesRange,
  SALES_RANGES,
  salesRange,
  type SalesRangeId,
} from '../../desk/salesRange';
import { ChipRow, downloadCsv, Field } from '../../kit';
import { Button } from '@/ui/Button';
import { salesCsv } from './salesCsv';
import { SalesFigures } from './SalesFigures';
import { SalesByDay } from './SalesByDay';
import { SalesDishes } from './SalesDishes';
import { SalesMix } from './SalesMix';
import { SalesHourStaff, SalesTax } from './SalesHourStaff';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

// Only a safety net while the venue loads; every venue has a zone in its opening hours.
const FALLBACK_ZONE = 'Africa/Accra';
const DAY_MS = 24 * 60 * 60 * 1000;

const isDay = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

/**
 * Sales as an analytics page (design canvas): Export CSV on the right of the title, a row of date
 * chips under it (Today to Last 30 days, then Pick dates for any days), figure cards that
 * compare with the period just before, order value as a line over every day of the period, then
 * the breakdowns two by two on wide screens (top dishes and how it was paid, where orders came
 * from and how they ended up).
 */
export function SalesScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { wide } = useOwnerLayout();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const [range, setRange] = useState<SalesRangeId>('30d');
  // Picked dates are typed as YYYY-MM-DD; both days are included.
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const customOk = isDay(from) && isDay(to) && from <= to;
  const picked = { id: range, from, to };
  const venue = useQuery({
    queryKey: ownerKeys.venue(venueId),
    queryFn: () => api.ownerGetVenue(venueId),
    enabled: Boolean(venueId),
  });
  const zone = venue.data?.hours.timezone ?? FALLBACK_ZONE;
  // The moment the page opened: day boundaries only move at midnight, and reopening refreshes it.
  const [openedAt] = useState(() => Date.now());
  const filter = salesRange(picked, openedAt, zone);
  const before = previousSalesRange(picked, openedAt, zone);
  const ready = Boolean(venueId) && (range !== 'custom' || customOk);
  const sales = useQuery({
    queryKey: [...ownerKeys.sales(venueId), range, from, to],
    queryFn: () => api.ownerGetSales(venueId, filter),
    enabled: ready,
  });
  const previous = useQuery({
    queryKey: [...ownerKeys.sales(venueId), range, from, to, 'previous'],
    queryFn: () => api.ownerGetSales(venueId, before ?? {}),
    enabled: ready && before !== null,
  });
  const r = sales.data;
  // The chart's first and last day in the venue's calendar; the last is today unless the range
  // ends earlier (yesterday ends at today's midnight).
  const day = (iso: string) => formatWhen(iso, zone).slice(0, 10);
  const chartFrom = filter.since ? day(filter.since) : null;
  const chartTo = filter.since
    ? day(
        filter.until
          ? new Date(Date.parse(filter.until) - DAY_MS).toISOString()
          : new Date(openedAt).toISOString(),
      )
    : null;

  return (
    <OwnerPage
      width="mid"
      title={t('owner.sales')}
      subtitle={t('ownerSales.lead')}
      action={
        <Button
          label={t('ownerSales.export')}
          tone="secondary"
          disabled={!r || r.days.length === 0}
          onPress={() =>
            r
              ? void downloadCsv(salesCsv(r), `cravins-sales-${range}.csv`, t('owner.sales'))
              : undefined
          }
        />
      }
    >
      <ChipRow<SalesRangeId>
        label={t('ownerOrders.range.label')}
        value={range}
        onChange={setRange}
        items={[...SALES_RANGES, 'custom' as const].map((id) => ({
          id,
          label: t(`ownerSales.range.${id}`),
        }))}
      />
      {range === 'custom' ? (
        <View style={[styles.dates, wide && styles.row]}>
          <View style={wide ? styles.flex : undefined}>
            <Field
              label={t('ownerInsights.from')}
              placeholder="2026-11-01"
              value={from}
              onChangeText={setFrom}
            />
          </View>
          <View style={wide ? styles.flex : undefined}>
            <Field
              label={t('ownerInsights.to')}
              placeholder="2026-11-12"
              value={to}
              onChangeText={setTo}
            />
          </View>
        </View>
      ) : null}
      <DeskWait
        loading={sales.isLoading && ready}
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
            {r.previous === null ? (
              <Text variant="caption" style={{ color: theme.muted }}>
                {t('ownerSales.noPrevious')}
              </Text>
            ) : null}
            <SalesByDay report={r} from={chartFrom} to={chartTo} />
            <View style={styles.section}>
              <Text variant="title" accessibilityRole="header">
                {t('ownerSales.topItems')}
              </Text>
              <SalesDishes report={r} wide={wide} />
            </View>
            <SalesMix report={r} wide={wide} />
            <SalesHourStaff report={r} wide={wide} />
            <SalesTax report={r} />
          </View>
        ) : null}
      </DeskWait>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  // Canvas: 56 px between Sales' sections, 20 px under each title.
  stack: { gap: tokens.owner.controls.todayGap },
  section: { gap: tokens.owner.controls.headGap },
  dates: { gap: tokens.space[3] },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  flex: { flex: 1, minWidth: 0 },
});
