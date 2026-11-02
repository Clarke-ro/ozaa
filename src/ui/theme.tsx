import { createContext, useContext, type ReactNode } from 'react';
import { deriveTheme, type DerivedTheme } from '@/features/theming';
import { NEUTRALS, type Scheme } from '@/theme/palette';

export type FontPair = 'ozaa' | 'serif' | 'bold';
export type { Scheme };

/**
 * Colours by role. Screens read these and never write a hex value.
 * `white` and `black` are kept as names for the page background and the strongest ink,
 * because guest screens use them; in dark mode they swap.
 */
export type Theme = {
  scheme: Scheme;
  fill: string;
  onFill: string;
  pressed: string;
  ink: string;
  tint: string;
  badgeInk: string;
  displayFont: string;
  /** Page background. */
  bg: string;
  /** Cards and grouped rows that sit on the page. */
  surface: string;
  text: string;
  muted: string;
  meta: string;
  line: string;
  wash: string;
  white: string;
  black: string;
  success: string;
  successTint: string;
  error: string;
  errorTint: string;
  warning: string;
  warningTint: string;
  /** Dim layer behind sheets and dialogs. */
  scrim: string;
  derived: DerivedTheme;
};

/** The heading font each font pair loads. Branding shows these as the choices. */
export const DISPLAY: Record<FontPair, string> = {
  ozaa: 'Unbounded_700',
  serif: 'NotoSerif_700',
  bold: 'Montserrat_800',
};

export function themeFromAccent(
  accent: string | null | undefined,
  fontPair: FontPair = 'ozaa',
  scheme: Scheme = 'light',
): Theme {
  const derived = deriveTheme(accent);
  const n = NEUTRALS[scheme];
  const dark = scheme === 'dark';
  return {
    scheme,
    fill: derived.fill,
    onFill: derived.onAccent,
    pressed: derived.pressed,
    // On a dark page the light-mode ink is too dim, so icons and links use the bright brand orange.
    ink: dark ? n.ink : derived.ink,
    tint: dark ? n.tint : derived.tint,
    badgeInk: dark ? n.badgeInk : derived.badgeInk,
    displayFont: DISPLAY[fontPair],
    bg: n.bg,
    surface: n.surface,
    text: n.text,
    muted: n.muted,
    meta: n.meta,
    line: n.line,
    wash: n.wash,
    white: n.bg,
    black: n.text,
    success: n.success,
    successTint: n.successTint,
    error: n.error,
    errorTint: n.errorTint,
    warning: n.warning,
    warningTint: n.warningTint,
    scrim: n.scrim,
    derived,
  };
}

export const ozaaTheme = themeFromAccent(null, 'ozaa');
export const ozaaDarkTheme = themeFromAccent(null, 'ozaa', 'dark');

/**
 * The owner app: same Ozaa colours, but pages sit on the canvas grey so white cards stand out.
 * Guest pages keep a white background (brand.md section 2).
 */
export const ozaaOwnerTheme: Theme = { ...ozaaTheme, bg: NEUTRALS.light.canvas };
export const ozaaOwnerDarkTheme: Theme = { ...ozaaDarkTheme, bg: NEUTRALS.dark.canvas };

const ThemeContext = createContext<Theme>(ozaaTheme);

export function ThemeProvider({ theme, children }: { theme: Theme; children: ReactNode }) {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

export const fontFamily = {
  regular: 'Inter_400',
  strong: 'Inter_600',
} as const;
