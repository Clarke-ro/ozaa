import { PAYSTACK_GH_FEE_BPS, passedFee, previewFee } from './paystackFee';

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

describe('previewFee', () => {
  const online = { online: true, cash: true, cardMachine: false };
  test('the same figure the server charges, when the venue passes a share', () => {
    expect(previewFee(10_000, { ...online, feePercent: 100 })).toBe(passedFee(10_000, 100));
    expect(previewFee(10_000, { ...online, feePercent: 50 })).toBe(passedFee(10_000, 50));
  });
  test('nothing when the venue keeps the fee, has no online payments, or nothing is due', () => {
    expect(previewFee(10_000, online)).toBe(0);
    expect(previewFee(10_000, { ...online, online: false, feePercent: 100 })).toBe(0);
    expect(previewFee(10_000, undefined)).toBe(0);
    expect(previewFee(0, { ...online, feePercent: 100 })).toBe(0);
  });
});
