import { PAYSTACK_GH_FEE_BPS, passedFee } from './paystackFee';

// What Paystack keeps from a payment of `gross` pesewas in Ghana (1.95%).
const paystackTakes = (gross: number) => Math.round((gross * PAYSTACK_GH_FEE_BPS) / 10_000);

describe('passedFee', () => {
  it('adds nothing when the venue keeps the fee', () => {
    expect(passedFee(10_000, 0)).toBe(0);
  });

  it('passes the whole fee so the venue still gets the full bill', () => {
    // GH₵100 → the guest pays GH₵101.99; Paystack keeps GH₵1.99 (1.95% of 101.99, rounded).
    expect(passedFee(10_000, 100)).toBe(199);
    expect(10_000 + 199 - paystackTakes(10_199)).toBeGreaterThanOrEqual(10_000);
  });

  it('passes part of the fee when the owner picks a percentage', () => {
    expect(passedFee(10_000, 50)).toBe(100);
    expect(passedFee(10_000, 25)).toBe(50);
  });

  it('never leaves the venue short when passing everything, at any bill size', () => {
    for (let base = 1; base <= 500_000; base += 997) {
      const fee = passedFee(base, 100);
      expect(base + fee - paystackTakes(base + fee)).toBeGreaterThanOrEqual(base);
    }
  });

  it('charges no fee on an empty bill', () => {
    expect(passedFee(0, 100)).toBe(0);
  });

  it('refuses a percentage outside 0–100 or a part-pesewa amount', () => {
    expect(() => passedFee(10_000, 101)).toThrow(RangeError);
    expect(() => passedFee(10_000, -1)).toThrow(RangeError);
    expect(() => passedFee(100.5, 100)).toThrow(RangeError);
  });
});
