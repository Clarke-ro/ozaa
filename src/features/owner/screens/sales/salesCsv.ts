import type { SalesReport } from '@/lib/api/types';

/**
 * Sales by day as CSV for a spreadsheet. Money goes out in cedis with two decimals, worked out
 * from whole pesewas (100 pesewas = 1 cedi) so there is no rounding drift.
 */
export function salesCsv(report: Pick<SalesReport, 'days' | 'currency'>): string {
  const cedis = (p: number) =>
    `${Math.trunc(p / 100)}.${String(Math.abs(p % 100)).padStart(2, '0')}`;
  const rows = report.days.map((d) => `${d.date},${d.orders},${cedis(d.pesewas)}`);
  return [`Date,Orders,Order value (${report.currency})`, ...rows].join('\n') + '\n';
}
