import type { SalesReport } from '@/lib/api/types';

type Day = SalesReport['days'][number];
type Item = SalesReport['topItems'][number];

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

/** The day that took the most money, for "Best day" under the chart. Null when nothing sold. */
export function bestDay(days: readonly Day[]): Day | null {
  const top = [...days].sort((a, b) => b.pesewas - a.pesewas)[0];
  return top && top.pesewas > 0 ? top : null;
}

/**
 * The four dishes that took the most money, each with its share of all order value, and the rest
 * added up as "Other dishes" (canvas). Whole percents.
 */
export function dishShares(items: readonly Item[], totalPesewas: number, shown = 4) {
  const sorted = [...items].sort((a, b) => b.pesewas - a.pesewas);
  const top = sorted.slice(0, shown).map((d) => ({ ...d, percent: pct(d.pesewas, totalPesewas) }));
  const rest = sorted.slice(shown);
  const other = rest.length
    ? (() => {
        const pesewas = rest.reduce((sum, d) => sum + d.pesewas, 0);
        return {
          count: rest.reduce((sum, d) => sum + d.count, 0),
          pesewas,
          percent: pct(pesewas, totalPesewas),
        };
      })()
    : null;
  return { top, other };
}

// The canvas order: in person first, then online, then what is still owed.
const METHODS = [
  'cash',
  'momo_merchant',
  'card_machine',
  'bank_transfer',
  'online_card',
  'online_momo',
] as const;

/** Every payment method's share of order value in a fixed order (zeros included), then not paid. */
export function paymentShares(
  r: Pick<SalesReport, 'valuePesewas'> & {
    payments: Pick<SalesReport['payments'], 'byMethod' | 'unpaidPesewas'>;
  },
): { key: string; percent: number }[] {
  const by = new Map((r.payments.byMethod ?? []).map((m) => [m.method, m.pesewas]));
  return [
    ...METHODS.map((key) => ({ key, percent: pct(by.get(key) ?? 0, r.valuePesewas) })),
    { key: 'unpaid', percent: pct(r.payments.unpaidPesewas, r.valuePesewas) },
  ];
}
