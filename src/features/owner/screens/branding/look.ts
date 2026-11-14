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

/** The text colour on the guest page's main button, its contrast ratio, and whether it reads well. */
export function buttonLook(
  accent: string,
  tint: Tint,
): { fill: string; ink: string; readable: boolean; ratio: number } {
  const derived = deriveTheme(isHex(accent) ? accent : null);
  const ink = tint === 'light' ? WHITE : tint === 'dark' ? INK : derived.onAccent;
  const ratio = contrast(ink, derived.fill);
  // Button labels are 16 px, so they need the full 4.5:1.
  return { fill: derived.fill, ink, readable: ratio >= 4.5, ratio };
}
