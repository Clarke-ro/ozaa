import { contrast, deriveTheme } from '@/features/theming';

export type Tint = 'auto' | 'light' | 'dark';

const WHITE = '#FFFFFF';
const INK = '#111111';
const HEX = /^#[0-9A-Fa-f]{6}$/;

export function isHex(text: string): boolean {
  return HEX.test(text.trim());
}

/** "d24000" or "#d24000 " becomes "#D24000"; anything else is returned trimmed for the owner to fix. */
export function normaliseHex(text: string): string {
  const t = text.trim();
  const withHash = t.startsWith('#') ? t : `#${t}`;
  return isHex(withHash) ? withHash.toUpperCase() : t;
}

/** The text colour on the guest page's main button, and whether that choice is hard to read. */
export function buttonLook(
  accent: string,
  tint: Tint,
): { fill: string; ink: string; readable: boolean } {
  const derived = deriveTheme(isHex(accent) ? accent : null);
  const ink = tint === 'light' ? WHITE : tint === 'dark' ? INK : derived.onAccent;
  // Button labels are 16 px, so they need the full 4.5:1.
  return { fill: derived.fill, ink, readable: contrast(ink, derived.fill) >= 4.5 };
}
