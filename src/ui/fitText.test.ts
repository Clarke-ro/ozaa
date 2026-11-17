import { fitFontSize } from './fitText';

describe('fitFontSize', () => {
  it('keeps the full size when the text already fits', () => {
    expect(fitFontSize({ size: 14, natural: 80, available: 100 })).toBe(14);
  });

  it('shrinks just enough to fit one line', () => {
    // "Pending orders" at 14 px is ~100 px; a phone tile has ~80 px.
    expect(fitFontSize({ size: 14, natural: 100, available: 80 })).toBeCloseTo(11.2);
  });

  it('never goes below the smallest readable size; the line ends in … instead', () => {
    expect(fitFontSize({ size: 14, natural: 300, available: 80 })).toBe(10);
    expect(fitFontSize({ size: 30, natural: 300, available: 80, min: 16 })).toBe(16);
  });

  it('keeps the full size until the space is measured', () => {
    expect(fitFontSize({ size: 14, natural: 100, available: 0 })).toBe(14);
  });
});
