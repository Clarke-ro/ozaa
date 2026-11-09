import { createContext, useContext, type ReactNode } from 'react';
import { deriveTheme, type DerivedTheme } from '@/features/theming';
import { NEUTRALS, type Scheme } from '@/theme/palette';
import { tokens } from '@/theme/tokens';

export type FontPair = 'cravins' | 'serif' | 'bold';
export type { Scheme };

export type TextVariant =
  'display-l' | 'display-m' | 'title' | 'body' | 'body-strong' | 'caption' | 'button';

/** Sizes that replace the brand scale for every Text under a theme (the owner app uses one). */
export type TypeScale = Partial<Record<TextVariant, { size: number; line: number }>>;

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
  /** Missing = the brand scale from tokens.type. */
  type?: TypeScale;
  derived: DerivedTheme;
};

/** The heading font each font pair loads. Branding shows these as the choices. */
export const DISPLAY: Record<FontPair, string> = {
  cravins: 'Unbounded_700',
  serif: 'NotoSerif_700',
  bold: 'Montserrat_800',
};

export function themeFromAccent(
  accent: string | null | undefined,
  fontPair: FontPair = 'cravins',
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

export const cravinsTheme = themeFromAccent(null, 'cravins');
export const cravinsDarkTheme = themeFromAccent(null, 'cravins', 'dark');

/**
 * The owner app: same Cravins colours, but pages sit on a very light orange canvas so white cards stand out.
 * Its type follows the reference dashboard (Clarke, 2026-11-07): Inter everywhere, numbers
 * included, on a smaller scale (tokens.owner.type). Guest pages keep a white background and
 * the brand scale (brand.md sections 2 and 3).
 */
const o = tokens.owner.type;
const OWNER_TYPE: TypeScale = {
  'display-l': o['display-l'],
  'display-m': o['display-m'],
  title: o.title,
  body: o.body,
  'body-strong': o['body-strong'],
  caption: o.caption,
  button: o.button,
};
const owner = { type: OWNER_TYPE, displayFont: 'Inter_600' };
export const cravinsOwnerTheme: Theme = { ...cravinsTheme, ...owner, bg: NEUTRALS.light.canvas };
export const cravinsOwnerDarkTheme: Theme = { ...cravinsDarkTheme, ...owner, bg: NEUTRALS.dark.canvas };

const ThemeContext = createContext<Theme>(cravinsTheme);

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
