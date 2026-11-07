import type { TFunction } from 'i18next';
import type { OwnerDashboard } from '@/lib/api/types';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { salesLine } from '../../desk/dashboardModel';
import type { Figure } from './todayFigures';

export type HeroText = { label: string; value: string; note: string };

/** One figure in the line under the big number: the value in bold, then the words after it. */
export type LineText = { value: string | null; words: string };

/**
 * The words for Today's big number. todayFigures only ever makes sales or the day's orders the
 * big number, so anything that is not sales reads as the order count.
 */
export function heroText(f: Figure, d: OwnerDashboard, t: TFunction): HeroText {
  if (f.key === 'sales') {
    const amount = formatMoney(pesewas(f.value ?? 0), d.currency);
    const line = salesLine(d);
    return {
      label: t('ownerDash.salesToday'),
      value: amount,
      note: t(line.key, { amount, percent: line.percent ?? 0 }),
    };
  }
  return {
    label: t('ownerDash.stats.ordersToday'),
    value: String(f.value ?? 0),
    note: t('ownerDash.notes.ordersToday'),
  };
}

/** The words for one figure in the line, e.g. "14" + "orders today", or "No ratings yet" alone. */
export function lineText(f: Figure, d: OwnerDashboard, t: TFunction): LineText {
  const count = f.value ?? 0;
  switch (f.key) {
    case 'sales':
      return {
        value: formatMoney(pesewas(count), d.currency),
        words: t('ownerDash.salesToday'),
      };
    case 'ordersToday':
      return { value: String(count), words: t('ownerDash.line.ordersToday', { count }) };
    case 'visitors':
      return { value: String(count), words: t('ownerDash.line.visitors', { count }) };
    case 'tables':
      return { value: String(count), words: t('ownerDash.line.tables', { count }) };
    case 'rating':
      return f.value == null
        ? { value: null, words: t('owner.noRating') }
        : {
            value: f.value.toFixed(1),
            words: t('ownerDash.line.rating', { count: d.ratingCount }),
          };
  }
}
