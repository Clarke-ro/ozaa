import { contrast } from '@/features/theming';
import { FLOOR_TONES, NEUTRALS } from './palette';

// Body text is 15-17 px, so every text role needs 4.5:1 on both surfaces it sits on.
describe.each(['light', 'dark'] as const)('%s neutrals', (scheme) => {
  const n = NEUTRALS[scheme];
  const grounds = { bg: n.bg, surface: n.surface };

  it.each(['text', 'muted', 'meta', 'ink', 'success', 'error', 'warning'] as const)(
    '%s reads at 4.5:1 on bg and surface',
    (role) => {
      for (const ground of Object.values(grounds)) {
        expect(contrast(n[role], ground)).toBeGreaterThanOrEqual(4.5);
      }
    },
  );

  it('badge ink reads at 4.5:1 on its tint', () => {
    expect(contrast(n.badgeInk, n.tint)).toBeGreaterThanOrEqual(4.5);
  });

  it.each([
    ['success', 'successTint'],
    ['error', 'errorTint'],
    ['warning', 'warningTint'],
  ] as const)('%s text reads at 4.5:1 on %s', (ink, tint) => {
    expect(contrast(n[ink], n[tint])).toBeGreaterThanOrEqual(4.5);
  });

  it('separators stay visible but quiet', () => {
    expect(contrast(n.line, n.surface)).toBeGreaterThan(1.15);
    expect(contrast(n.line, n.surface)).toBeLessThan(3);
  });
});

it('dark text is off-white, not pure white, and dark surfaces are not pure black', () => {
  expect(NEUTRALS.dark.text).not.toBe('#FFFFFF');
  expect(NEUTRALS.dark.surface).not.toBe('#000000');
});

describe.each(['light', 'dark'] as const)('%s floor tones', (scheme) => {
  it.each(Object.keys(FLOOR_TONES[scheme]) as (keyof (typeof FLOOR_TONES)['light'])[])(
    '%s text reads at 4.5:1 on its card',
    (tone) => {
      const { bg, ink } = FLOOR_TONES[scheme][tone];
      expect(contrast(ink, bg)).toBeGreaterThanOrEqual(4.5);
    },
  );
});
