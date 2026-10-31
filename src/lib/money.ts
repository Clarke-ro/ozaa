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

export function parsePesewas(value: unknown): Pesewas | null {
  if (typeof value !== 'number' || !isPesewas(value)) return null;
  return value;
}
