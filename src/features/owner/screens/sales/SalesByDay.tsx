import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react-native';
import type { SalesReport } from '@/lib/api/types';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { AreaChart, Segmented, TitledSection } from '../../kit';
import { shortMoney } from '../insights/insightsModel';
import { bestDay } from './salesModel';

type Show = 'value' | 'orders';
const DAY_MS = 86_400_000;

/**
 * "By day" (design canvas): an Order value / Orders switch beside the title, the line over every
 * day of the period, and the best day under it.
 */
export function SalesByDay({
  report: r,
  from,
  to,
}: {
  report: SalesReport;
  /** First and last day of the period (YYYY-MM-DD, venue time); null for all time. */
  from: string | null;
  to: string | null;
}) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const [show, setShow] = useState<Show>('value');
  const money = (amount: number) => formatMoney(pesewas(amount), r.currency);
  // Every day of the period, with zero on days nothing sold, so the line never skips a day.
  const byDate = new Map(r.days.map((d) => [d.date, d]));
  const dates =
    from && to
      ? Array.from(
          { length: Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS) + 1 },
          (_, i) =>
            new Date(Date.parse(`${from}T00:00:00Z`) + i * DAY_MS).toISOString().slice(0, 10),
        )
      : [...byDate.keys()].sort();
  const label = (date: string) =>
    new Date(`${date}T12:00:00Z`).toLocaleDateString(i18n.language, {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    });
  const best = bestDay(r.days);
  return (
    <TitledSection
      title={t('ownerSales.byDay')}
      cardStyle={styles.card}
      action={
        <Segmented<Show>
          label={t('ownerSales.byDay')}
          value={show}
          onChange={setShow}
          options={[
            { id: 'value', label: t('ownerSales.stats.value') },
            { id: 'orders', label: t('ownerSales.stats.orders') },
          ]}
        />
      }
    >
      {r.orderCount === 0 ? (
        <Text variant="body" style={{ color: theme.muted }}>
          {t('ownerSales.empty')}
        </Text>
      ) : (
        <>
          <AreaChart
            points={dates.map((date) => {
              const day = byDate.get(date);
              return {
                label: label(date),
                value: show === 'value' ? (day?.pesewas ?? 0) : (day?.orders ?? 0),
              };
            })}
            format={show === 'value' ? money : (v) => t('ownerSales.orders', { count: v })}
            axis={
              show === 'value' ? (v) => shortMoney(v, r.currency) : (v) => String(Math.round(v))
            }
            summary={t('ownerSales.overTimeSummary')}
          />
          {best ? (
            <View style={[styles.best, { borderTopColor: theme.wash }]}>
              <Star size={18} color={theme.ink} />
              <Text style={styles.bestText}>
                {t('ownerSales.bestDay')} <Text style={styles.strong}>{label(best.date)}</Text>
                {` · ${t('ownerSales.bestDayDetail', { amount: money(best.pesewas), count: best.orders })}`}
              </Text>
            </View>
          ) : null}
        </>
      )}
    </TitledSection>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingTop: tokens.space[6],
    paddingHorizontal: tokens.space[6],
    paddingBottom: tokens.space[5],
    gap: tokens.space[3],
  },
  best: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  bestText: { flex: 1, fontSize: 15, lineHeight: 22 },
  strong: { fontFamily: fontFamily.strong },
});
