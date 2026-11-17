// Browsers round text widths, so aim 1% under the room to never be cut off by a fraction.
const SPARE = 0.99;

/**
 * The font size that fits a line of text in the space it has: the full size when it fits,
 * smaller when it doesn't. There is no floor: every word always shows, never "…" (Clarke,
 * 2026-11-17). `natural` is the text's width at `size`; width grows in step with font size.
 */
export function fitFontSize({
  size,
  natural,
  available,
}: {
  size: number;
  natural: number;
  available: number;
}): number {
  if (available <= 0 || natural <= available) return size;
  return (size * available * SPARE) / natural;
}
