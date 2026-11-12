import type { TaxLine, TaxSetup } from '@/lib/api/types';

// Ghana's standard E-VAT on restaurant food: VAT 15%, NHIL 2.5% and GETFund 2.5%,
// all worked out on the same base (the price before tax). So the three together are 20%.
const RATES = [
  { code: 'vat', label: 'VAT', rate: 0.15 },
  { code: 'nhil', label: 'NHIL', rate: 0.025 },
  { code: 'getfund', label: 'GETFund', rate: 0.025 },
] as const;
const TOTAL_RATE = 0.2;

/**
 * Tax lines for an amount once tax is set up. With prices that include tax, the lines are the
 * part of the price that is tax (nothing added). Otherwise they go on top. Rounded to the pesewa.
 */
export function taxLines(
  amountPesewas: number,
  setup: Pick<TaxSetup, 'enabled' | 'pricesIncludeTax'> | null | undefined,
): { lines: TaxLine[]; addedPesewas: number } {
  if (!setup?.enabled || amountPesewas <= 0) return { lines: [], addedPesewas: 0 };
  const base = setup.pricesIncludeTax ? amountPesewas / (1 + TOTAL_RATE) : amountPesewas;
  const lines: TaxLine[] = RATES.map(({ code, label, rate }) => ({
    code,
    label,
    amountPesewas: Math.round(base * rate),
  }));
  const tax = lines.reduce((sum, line) => sum + line.amountPesewas, 0);
  return { lines, addedPesewas: setup.pricesIncludeTax ? 0 : tax };
}
