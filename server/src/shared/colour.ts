// Generated from src/features/theming/colour.ts by scripts/sync-server-shared.mjs. Do not edit here.
export type Rgb = [number, number, number];

export function hexToRgb(hex: string): Rgb {
  let value = hex.replace('#', '');
  if (value.length === 3)
    value = value
      .split('')
      .map((char) => char + char)
      .join('');
  const rgb: Rgb = [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
  return rgb;
}

export function rgbToHex(rgb: Rgb): string {
  return (
    '#' +
    rgb
      .map((channel) =>
        Math.round(Math.max(0, Math.min(255, channel)))
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
      .toUpperCase()
  );
}

function channelLuminance(channel: number): number {
  const value = channel / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const [red, green, blue] = hexToRgb(hex);
  return (
    0.2126 * channelLuminance(red) +
    0.7152 * channelLuminance(green) +
    0.0722 * channelLuminance(blue)
  );
}

/** WCAG 2.1 contrast ratio. */
export function contrast(left: string, right: string): number {
  const lighter = Math.max(relativeLuminance(left), relativeLuminance(right));
  const darker = Math.min(relativeLuminance(left), relativeLuminance(right));
  return (lighter + 0.05) / (darker + 0.05);
}

export function mix(from: string, to: string, amount: number): string {
  const start = hexToRgb(from);
  const end = hexToRgb(to);
  const mixed: Rgb = [
    start[0] + (end[0] - start[0]) * amount,
    start[1] + (end[1] - start[1]) * amount,
    start[2] + (end[2] - start[2]) * amount,
  ];
  return rgbToHex(mixed);
}

function lab(hex: string): [number, number, number] {
  const [red, green, blue] = hexToRgb(hex).map((channel) => {
    const value = channel / 255;
    return value > 0.04045 ? ((value + 0.055) / 1.055) ** 2.4 : value / 12.92;
  }) as Rgb;
  const x = (0.4124 * red + 0.3576 * green + 0.1805 * blue) / 0.95047;
  const y = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  const z = (0.0193 * red + 0.1192 * green + 0.9505 * blue) / 1.08883;
  const pivot = (value: number) => (value > 0.008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116);
  return [116 * pivot(y) - 16, 500 * (pivot(x) - pivot(y)), 200 * (pivot(y) - pivot(z))];
}

/** CIE76 distance. Customise warns when this is under 20 from Cravins orange. */
export function deltaE(left: string, right: string): number {
  const a = lab(left);
  const b = lab(right);
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

export function darkenUntil(colour: string, background: string, minimum: number): string {
  let current = colour;
  let step = 0;
  while (contrast(current, background) < minimum && step < 1) {
    step += 0.02;
    current = mix(colour, '#000000', step);
  }
  return current;
}
