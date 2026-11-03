import type { InsightsReport } from '@/lib/api/types';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';

type Mood = { positive: number; neutral: number; negative: number };

/** Feedback notes in the period, by mood. */
export function moodTotals(series: InsightsReport['feedbackSentimentSeries']): Mood {
  return (series ?? []).reduce(
    (sum, day) => ({
      positive: sum.positive + day.positive,
      neutral: sum.neutral + day.neutral,
      negative: sum.negative + day.negative,
    }),
    { positive: 0, neutral: 0, negative: 0 },
  );
}

/** The hour with the most orders, or null when there were none. */
export function busiestHour(hours: InsightsReport['peakHours']): number | null {
  const top = [...hours].sort((a, b) => b.orders - a.orders)[0];
  return top && top.orders > 0 ? top.hour : null;
}

/** Money for small spaces: full under 1,000, then "12.5k" with the currency symbol kept. */
export function shortMoney(minor: number, currency: string): string {
  if (minor < 100_000) return formatMoney(pesewas(Math.round(minor)), currency);
  const symbol = formatMoney(pesewas(0), currency).replace(/[\d.,\s]/g, '');
  const k = minor / 100_000;
  return `${symbol}${k >= 100 ? Math.round(k) : Math.round(k * 10) / 10}k`;
}
