import { fitFontSize } from './fitText';

describe('fitFontSize', () => {
  it('keeps the full size when the text already fits', () => {
    expect(fitFontSize({ size: 14, natural: 80, available: 100 })).toBe(14);
  });

  it('shrinks just enough to fit one line, with 1% to spare for rounding', () => {
    // "Pending orders" at 14 px is ~100 px; a phone tile has ~80 px.
    expect(fitFontSize({ size: 14, natural: 100, available: 80 })).toBeCloseTo(11.088);
  });

  it('always shows every word: it keeps shrinking instead of cutting the line off', () => {
    const size = fitFontSize({ size: 14, natural: 300, available: 80 });
    expect((300 * size) / 14).toBeLessThanOrEqual(80);
  });

  it('keeps the full size until the space is measured', () => {
    expect(fitFontSize({ size: 14, natural: 100, available: 0 })).toBe(14);
  });
});
