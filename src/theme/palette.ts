import { tokens } from './tokens';

export type Scheme = 'light' | 'dark';

type Neutrals = {
  bg: string;
  surface: string;
  wash: string;
  line: string;
  text: string;
  muted: string;
  meta: string;
  ink: string;
  tint: string;
  badgeInk: string;
  success: string;
  successTint: string;
  error: string;
  errorTint: string;
  warning: string;
  warningTint: string;
  scrim: string;
};

const c = tokens.color;

/**
 * Light comes straight from design/tokens.json. Dark is derived for the owner app only:
 * guest pages stay light because venue colours are checked against white.
 * Contrast for every text role is enforced in palette.test.ts.
 */
export const NEUTRALS: Record<Scheme, Neutrals> = {
  light: {
    bg: c.white.hex,
    surface: c.white.hex,
    wash: c.grey100.hex,
    line: c.grey200.hex,
    text: c.black.hex,
    muted: c.grey600.hex,
    meta: c.grey500.hex,
    ink: c.primary.hex,
    tint: c.primaryTint.hex,
    badgeInk: c.primaryTint.textOnTint.hex,
    success: c.success.hex,
    successTint: '#F0FDF4',
    error: c.error.hex,
    errorTint: '#FEF2F2',
    warning: '#92400E',
    warningTint: '#FEF3C7',
    scrim: 'rgba(17,17,17,0.45)',
  },
  dark: {
    // Not pure black, so cards can sit one step above the page.
    bg: '#0E0E10',
    surface: '#1A1A1D',
    wash: '#26262A',
    line: '#3A3A3F',
    // About 93% white: pure white glares on a dark page.
    text: '#EDEDEF',
    muted: '#B4B4BB',
    meta: '#9A9AA2',
    // Bright brand orange reads at 5:1 on the dark surface; the light-mode #D24000 does not.
    ink: c.brand.hex,
    tint: '#3A1A0C',
    badgeInk: '#FF9A6B',
    success: '#4ADE80',
    successTint: '#10291A',
    error: '#F87171',
    errorTint: '#2E1414',
    warning: '#FBBF24',
    warningTint: '#2E2410',
    scrim: 'rgba(0,0,0,0.6)',
  },
};

export type FloorTone = 'free' | 'occupied' | 'paying' | 'calling';

/**
 * Table-card colours on the Floor screen. Each status family gets its own colour so a waiter can
 * read the room at a glance; the card also shows an icon and a word, so colour is never the only cue.
 */
export const FLOOR_TONES: Record<
  Scheme,
  Record<FloorTone, { bg: string; ink: string; edge: string }>
> = {
  light: {
    free: { bg: '#E7F6EC', ink: '#14532D', edge: '#86EFAC' },
    occupied: { bg: '#E6EEFC', ink: '#1E3A8A', edge: '#93C5FD' },
    paying: { bg: '#FEF3DC', ink: '#7C2D12', edge: '#FCD34D' },
    calling: { bg: '#FDE8E8', ink: '#7F1D1D', edge: '#FCA5A5' },
  },
  dark: {
    free: { bg: '#0F2A1A', ink: '#A7F3C0', edge: '#166534' },
    occupied: { bg: '#121F3D', ink: '#BFD3FE', edge: '#1E40AF' },
    paying: { bg: '#2E2108', ink: '#FCD9A0', edge: '#92400E' },
    calling: { bg: '#341414', ink: '#FECACA', edge: '#991B1B' },
  },
};
