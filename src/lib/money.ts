import { isPesewas, pesewas, type Pesewas } from './brand';

/** GH₵65 for whole cedis, GH₵65.50 when there are pesewas. */
export function formatCedis(amount: Pesewas): string {
  const cedis = Math.floor(amount / 100);
  const rest = amount % 100;
  const whole = cedis.toLocaleString('en-GH');
  if (rest === 0) return `GH₵${whole}`;
  return `GH₵${whole}.${String(rest).padStart(2, '0')}`;
}

export function addPesewas(left: Pesewas, right: Pesewas): Pesewas {
  return pesewas(left + right);
}

export function sumPesewas(amounts: readonly Pesewas[]): Pesewas {
  return pesewas(amounts.reduce((total, amount) => total + amount, 0));
}

/** Half-up to the nearest pesewa. Used for tip percents. */
export function percentOf(amount: Pesewas, percent: number): Pesewas {
  if (!Number.isInteger(percent) || percent < 0) throw new Error('Percent must be a whole number');
  return pesewas(Math.round((amount * percent) / 100));
}

const MONEY_LOCALE: Record<string, string> = {
  GHS: 'en-GH',
  NGN: 'en-NG',
  KES: 'en-KE',
  ZAR: 'en-ZA',
  USD: 'en-US',
  XOF: 'fr-SN',
};

/** GHS stays GH₵. Other currencies use the locale that matches the venue. XOF has no minor unit. */
export function formatMoney(amount: Pesewas, currency = 'GHS'): string {
  if (currency === 'GHS') return formatCedis(amount);
  const locale = MONEY_LOCALE[currency] ?? 'en';
  const zeroMinor = currency === 'XOF';
  const major = zeroMinor ? amount : amount / 100;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: zeroMinor ? 0 : undefined,
  }).format(major);
}

/** Owner price fields. "65.50" and "GH₵2,480" both become pesewas. */
export function parseMoneyInput(text: string): Pesewas | null {
  const cleaned = text.replace(/[^\d.]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, fraction = ''] = cleaned.split('.');
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!isPesewas(amount)) return null;
  return pesewas(amount);
}

export function parsePesewas(value: unknown): Pesewas | null {
  if (typeof value !== 'number' || !isPesewas(value)) return null;
  return value;
}
