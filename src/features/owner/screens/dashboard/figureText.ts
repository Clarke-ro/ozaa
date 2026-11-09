import type { TFunction } from 'i18next';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import type { Figure } from './todayFigures';

export type FigureText = { label: string; value: string };

/** The words and the formatted number for one of Today's stat cards. */
export function figureText(f: Figure, currency: string, t: TFunction): FigureText {
  switch (f.key) {
    case 'sales':
      return { label: t('ownerDash.salesToday'), value: formatMoney(pesewas(f.value), currency) };
    case 'ordersToday':
      return { label: t('ownerDash.stats.ordersToday'), value: String(f.value) };
    case 'pending':
      return { label: t('ownerDash.stats.pending'), value: String(f.value) };
    case 'visitors':
      return { label: t('ownerDash.stats.visitors'), value: String(f.value) };
  }
}
