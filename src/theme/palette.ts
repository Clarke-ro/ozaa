import { tokens } from './tokens';

export type Scheme = 'light' | 'dark';

/** Shadows are drawn in black on both schemes; their opacity sets the strength. */
export const SHADOW_INK = '#000000';

/** Frosted white over a photo or the game board, so dark text and icons stay readable. */
export const PHOTO_VEIL = 'rgba(255,255,255,0.92)';

/** Loyalty tier dots (design canvas). Each tier also has its name beside the dot. */
export const TIER_DOTS = { bronze: '#B08D57', silver: '#9CA3AF', gold: '#C9A227' } as const;

/** The phone drawn around owner previews (design canvas): a black body with a grey rim. */
export const PHONE_FRAME = { body: '#0B0B0C', rim: '#9A9A9F' } as const;

/** QR codes sit on white in both schemes: phone cameras read dark-on-light most reliably. */
export const QR_PAPER = '#FFFFFF';
/** The dark of a QR code and of printed table cards: near-black, never following dark mode. */
export const QR_INK = '#111111';

/**
 * The Sales card on Today: a warm off-white with near-black text and a grey edge, the same in
 * both schemes (Clarke, 2026-11-23; it was burgundy before). The ink on this fill is about 17:1,
 * far past the 4.5:1 text needs. The edge keeps the card visible on the cool grey canvas.
 */
export const SALES_CARD = { fill: '#F3F3F0', ink: '#111111', edge: '#E4E4E7' } as const;

/** Venue colours offered in Branding (canvas). Names come from ownerBranding.swatch.<id>. */
export const VENUE_SWATCHES = [
  { id: 'clay', hex: '#B5432A' },
  { id: 'orange', hex: '#D24000' },
  { id: 'red', hex: '#B42318' },
  { id: 'pink', hex: '#BE185D' },
  { id: 'purple', hex: '#6D28D9' },
  { id: 'blue', hex: '#1D4ED8' },
  { id: 'teal', hex: '#0E7490' },
  { id: 'green', hex: '#0F7A55' },
  { id: 'gold', hex: '#E8B931' },
  { id: 'black', hex: '#111111' },
] as const;

/**
 * Table-card colours (canvas). "venue" has no hex here: the screen fills in the venue's own
 * accent. Names come from ownerTables.accents.<id>.
 */
export const CARD_SWATCHES = [
  { id: 'orange', hex: '#D24000' },
  { id: 'venue', hex: '' },
  { id: 'black', hex: '#111111' },
  { id: 'red', hex: '#B42318' },
  { id: 'pink', hex: '#BE185D' },
  { id: 'purple', hex: '#6D28D9' },
  { id: 'blue', hex: '#1D4ED8' },
  { id: 'teal', hex: '#0E7490' },
  { id: 'green', hex: '#0F7A55' },
  { id: 'gold', hex: '#A16207' },
  { id: 'brown', hex: '#6B3E26' },
  { id: 'slate', hex: '#475569' },
] as const;

type Neutrals = {
  bg: string;
  /** Owner page background: one step off the card surface so cards stand out. */
  canvas: string;
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
  /** The groove behind a segmented control (canvas: a warm grey from the page's own family). */
  track: string;
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
    canvas: c.canvas.hex,
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
    track: '#E7E7E2',
  },
  dark: {
    // Not pure black, so cards can sit one step above the page.
    bg: '#0E0E10',
    canvas: '#0E0E10',
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
    track: '#26262A',
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

export type StatusTone = 'order' | 'info' | 'success' | 'alert' | 'bill';

/**
 * Tinted action buttons and count badges from the design canvas: each stage has its own colour
 * ("Start cooking" orange, "Mark ready" blue, "Mark served" green, "On my way" red, "Open bill"
 * amber). The label always names the action, so colour is never the only cue.
 */
export const STATUS_TONES: Record<
  Scheme,
  Record<StatusTone, { bg: string; ink: string; line: string }>
> = {
  light: {
    order: { bg: '#FFE4D6', ink: '#A33200', line: '#D24000' },
    info: { bg: '#DCE6FF', ink: '#1E40AF', line: '#1D4ED8' },
    success: { bg: '#D3F5E0', ink: '#166534', line: '#15803D' },
    alert: { bg: '#FDE2DF', ink: '#9F1C12', line: '#B42318' },
    bill: { bg: '#FDEFC8', ink: '#8A4B05', line: '#B54708' },
  },
  dark: {
    order: { bg: '#3A1A0C', ink: '#FFB08A', line: '#FF7A3D' },
    info: { bg: '#16224A', ink: '#BFD3FE', line: '#6E95F5' },
    success: { bg: '#0F2A1A', ink: '#A7F3C0', line: '#4ADE80' },
    alert: { bg: '#341414', ink: '#FECACA', line: '#F87171' },
    bill: { bg: '#2E2108', ink: '#FCD9A0', line: '#FBBF24' },
  },
};
