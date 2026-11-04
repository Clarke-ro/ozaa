import { isPesewas, pesewas, type Pesewas } from './brand';

/** Ghana is the sample market. Screens pass the venue currency; they do not bake in a symbol. */
export const DEFAULT_CURRENCY = 'GHS';

/** Locale used when the caller does not pass one. Grouping and the symbol come from Intl. */
const LOCALE_FOR_CURRENCY: Record<string, string> = {
  GHS: 'en-GH',
  NGN: 'en-NG',
  KES: 'en-KE',
  TZS: 'sw-TZ',
  ZAR: 'en-ZA',
  EGP: 'ar-EG',
  XOF: 'fr-SN',
  XAF: 'fr-CM',
  EUR: 'fr-FR',
  USD: 'en-US',
  GBP: 'en-GB',
};

/**
 * Formats minor units. 100 is one major unit, so 6500 pesewas is GH₵65 in the Accra sample.
 * The same integer formats as naira, euros, or shillings when `currency` says so.
 * Whole amounts drop the decimals, matching the sample renders.
 */
export function formatMoney(
  amount: Pesewas,
  currency: string = DEFAULT_CURRENCY,
  locale?: string,
): string {
  const code = /^[A-Z]{3}$/.test(currency) ? currency : DEFAULT_CURRENCY;
  const formatLocale = locale ?? LOCALE_FOR_CURRENCY[code] ?? 'en';
  const zeroMinor = code === 'XOF' || code === 'XAF';
  const major = zeroMinor ? amount : amount / 100;
  const rest = zeroMinor ? 0 : amount % 100;
  try {
    const isoDigits =
      new Intl.NumberFormat(formatLocale, { style: 'currency', currency: code }).resolvedOptions()
        .maximumFractionDigits ?? 2;
    const fractionDigits = rest === 0 || isoDigits === 0 ? 0 : 2;
    return new Intl.NumberFormat(formatLocale, {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(major);
  } catch {
    const whole = Math.floor(major).toLocaleString('en');
    if (rest === 0) return `${code} ${whole}`;
    return `${code} ${whole}.${String(rest).padStart(2, '0')}`;
  }
}

export function formatCedis(amount: Pesewas): string {
  return formatMoney(amount, 'GHS');
}

export function sumPesewas(amounts: readonly Pesewas[]): Pesewas {
  return pesewas(amounts.reduce((total, amount) => total + amount, 0));
}

/** Half-up to the nearest minor unit. Used for tip percents. */
export function percentOf(amount: Pesewas, percent: number): Pesewas {
  if (!Number.isInteger(percent) || percent < 0) throw new Error('Percent must be a whole number');
  return pesewas(Math.round((amount * percent) / 100));
}

/** Owner price fields. "65.50" and "GH₵2,480" both become pesewas. */
export function parseMoneyInput(text: string): Pesewas | null {
  // Symbols and commas are dropped below ("GH₵2,480" is fine), but a minus sign is never a price.
  if (text.includes('-')) return null;
  const cleaned = text.replace(/[^\d.]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, fraction = ''] = cleaned.split('.');
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!isPesewas(amount)) return null;
  return pesewas(amount);
}
