/**
 * The font size that fits a line of text in the space it has: the full size when it fits, smaller
 * when it doesn't, but never below `min` (10 px reads on a phone; past that the line ends in …).
 * `natural` is the text's width at `size`; text width grows in step with font size.
 */
export function fitFontSize({
  size,
  natural,
  available,
  min = 10,
}: {
  size: number;
  natural: number;
  available: number;
  min?: number;
}): number {
  if (available <= 0 || natural <= available) return size;
  return Math.max(Math.min(min, size), (size * available) / natural);
}
