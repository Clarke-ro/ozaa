/**
 * Paystack's fee in Ghana: 1.95% of what the guest pays, for cards and mobile money, in basis
 * points (1 bp = 0.01%). One place to change it if Paystack changes its price.
 */
export const PAYSTACK_GH_FEE_BPS = 195;

/**
 * The Paystack fee the guest pays on top of `basePesewas`, when the venue passes `percent` of it
 * on (0 = the venue keeps it all, 100 = the guest pays it all). Server and mock use this; the app
 * only shows the server's figure.
 *
 * Passing it all uses Paystack's own gross-up: the guest pays base ÷ (1 − 1.95%), rounded up to
 * the pesewa, so after Paystack takes its cut the venue still receives the whole bill. A part is
 * that share of the full fee, rounded to the nearest pesewa.
 */
export function passedFee(
  basePesewas: number,
  percent: number,
  feeBps: number = PAYSTACK_GH_FEE_BPS,
): number {
  if (!Number.isInteger(basePesewas) || basePesewas < 0) {
    throw new RangeError('The bill must be whole pesewas, zero or more');
  }
  if (!Number.isInteger(percent) || percent < 0 || percent > 100) {
    throw new RangeError('The share of the fee must be a whole percentage from 0 to 100');
  }
  if (basePesewas === 0 || percent === 0) return 0;
  // Whole-number maths, so no floating-point pesewas creep in.
  const gross = Math.ceil((basePesewas * 10_000) / (10_000 - feeBps));
  const full = gross - basePesewas;
  return Math.round((full * percent) / 100);
}
