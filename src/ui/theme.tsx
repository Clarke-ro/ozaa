import { createContext, useContext, type ReactNode } from 'react';
import { deriveTheme, type DerivedTheme } from '@/features/theming';
import { tokens } from '@/theme/tokens';

export type FontPair = 'ozaa' | 'serif' | 'bold';

export type Theme = {
  fill: string;
  onFill: string;
  pressed: string;
  ink: string;
  tint: string;
  badgeInk: string;
  displayFont: string;
  text: string;
  muted: string;
  meta: string;
  line: string;
  wash: string;
  white: string;
  success: string;
  error: string;
  black: string;
  derived: DerivedTheme;
};

const DISPLAY: Record<FontPair, string> = {
  ozaa: 'Unbounded_700',
  serif: 'NotoSerif_700',
  bold: 'Montserrat_800',
};

export function themeFromAccent(accent: string | null | undefined, fontPair: FontPair = 'ozaa'): Theme {
  const derived = deriveTheme(accent);
  return {
    fill: derived.fill,
    onFill: derived.onAccent,
    pressed: derived.pressed,
    ink: derived.ink,
    tint: derived.tint,
    badgeInk: derived.badgeInk,
    displayFont: DISPLAY[fontPair],
    text: tokens.color.black.hex,
    muted: tokens.color.grey600.hex,
    meta: tokens.color.grey500.hex,
    line: tokens.color.grey200.hex,
    wash: tokens.color.grey100.hex,
    white: tokens.color.white.hex,
    success: tokens.color.success.hex,
    error: tokens.color.error.hex,
    black: tokens.color.black.hex,
    derived,
  };
}

export const ozaaTheme = themeFromAccent(null, 'ozaa');

const ThemeContext = createContext<Theme>(ozaaTheme);

export function ThemeProvider({ theme, children }: { theme: Theme; children: ReactNode }) {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
