// Generated from src/features/theming/deriveTheme.ts by scripts/sync-server-shared.mjs. Do not edit here.
import { contrast, darkenUntil, deltaE, mix } from './colour.ts';

const BLACK = '#111111';
const WHITE = '#FFFFFF';
const AA = 4.5;

/** Bright orange is the logo. The deeper orange is what white text sits on. */
export const CRAVINS = {
  brand: '#FC5205',
  primary: '#D24000',
  hover: '#BA3800',
  pressed: '#A33000',
  tint: '#FFF1EA',
} as const;

export type DerivedTheme = {
  accent: string;
  fill: string;
  onAccent: string;
  pressed: string;
  ink: string;
  tint: string;
  badgeInk: string;
  isDefault: boolean;
  tooCloseToCravins: boolean;
  notes: string[];
  cravinsDistance: number;
  ratios: { buttonText: number; inkOnWhite: number; badge: number; whiteOnAccent: number };
};

const round2 = (value: number) => Number(value.toFixed(2));

function derived(
  input: Omit<DerivedTheme, 'ratios' | 'tooCloseToCravins'> & { whiteOnAccent: number },
): DerivedTheme {
  return {
    ...input,
    tooCloseToCravins: !input.isDefault && input.cravinsDistance < 20,
    ratios: {
      buttonText: round2(contrast(input.onAccent, input.fill)),
      inkOnWhite: round2(contrast(input.ink, WHITE)),
      badge: round2(contrast(input.badgeInk, input.tint)),
      whiteOnAccent: round2(input.whiteOnAccent),
    },
  };
}

/** No venue colour yet uses Cravins's tuned orange, not the generic darkening loop. */
export function deriveTheme(accent?: string | null): DerivedTheme {
  if (!accent) {
    return derived({
      accent: CRAVINS.primary,
      fill: CRAVINS.primary,
      onAccent: WHITE,
      pressed: CRAVINS.pressed,
      ink: CRAVINS.primary,
      tint: CRAVINS.tint,
      badgeInk: CRAVINS.hover,
      isDefault: true,
      notes: [],
      cravinsDistance: 0,
      whiteOnAccent: contrast(WHITE, CRAVINS.primary),
    });
  }

  const colour = accent.toUpperCase();
  const notes: string[] = [];
  const whiteOn = contrast(WHITE, colour);
  const blackOn = contrast(BLACK, colour);
  let onAccent = WHITE;
  let fill = colour;
  if (whiteOn < AA) {
    if (blackOn >= AA) {
      onAccent = BLACK;
      notes.push(
        `White text on ${colour} is ${whiteOn.toFixed(2)}:1, so buttons use dark text (${blackOn.toFixed(2)}:1).`,
      );
    } else {
      fill = darkenUntil(colour, WHITE, AA);
      notes.push(
        `Neither white nor dark text passes on ${colour}, so buttons use the darker ${fill}.`,
      );
    }
  }

  const ink = contrast(colour, WHITE) >= AA ? colour : darkenUntil(colour, WHITE, AA);
  if (ink !== colour) {
    notes.push(
      `${colour} on white is ${contrast(colour, WHITE).toFixed(2)}:1, so icons and links use ${ink} (${contrast(ink, WHITE).toFixed(2)}:1).`,
    );
  }

  const tint = mix(colour, WHITE, 0.86);
  const badgeInk = darkenUntil(ink, tint, AA);
  const pressed = onAccent === WHITE ? mix(fill, '#000000', 0.14) : mix(fill, '#000000', 0.08);
  const cravinsDistance = Math.min(deltaE(colour, CRAVINS.primary), deltaE(colour, CRAVINS.brand));
  if (cravinsDistance < 20) {
    notes.push(
      `${colour} is very close to Cravins orange, so guests may not tell your buttons from ours. A deeper or different colour will stand out more.`,
    );
  }

  return derived({
    accent: colour,
    fill,
    onAccent,
    pressed,
    ink,
    tint,
    badgeInk,
    isDefault: false,
    notes,
    cravinsDistance: Number(cravinsDistance.toFixed(1)),
    whiteOnAccent: whiteOn,
  });
}

export function pairsPass(theme: DerivedTheme): boolean {
  return theme.ratios.buttonText >= AA && theme.ratios.inkOnWhite >= AA && theme.ratios.badge >= AA;
}
