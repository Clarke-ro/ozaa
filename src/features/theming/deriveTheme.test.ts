import { contrast } from './colour';
import { deriveTheme, pairsPass } from './deriveTheme';

test('Mama’s Kitchen keeps white text on the brick colour', () => {
  const theme = deriveTheme('#B5432A');
  expect(theme.onAccent).toBe('#FFFFFF');
  expect(theme.ratios.buttonText).toBe(5.52);
  expect(theme.ink).toBe('#B5432A');
  expect(theme.pressed).toBe('#9C3A24');
  expect(theme.tint).toBe('#F5E5E1');
  expect(theme.badgeInk).toBe('#B5432A');
  expect(theme.tooCloseToCravins).toBe(false);
  expect(theme.cravinsDistance).toBe(24.2);
});

test('Bean There keeps white text on the green', () => {
  const theme = deriveTheme('#1F5C3F');
  expect(theme.onAccent).toBe('#FFFFFF');
  expect(theme.ratios.buttonText).toBe(7.89);
  expect(theme.ink).toBe('#1F5C3F');
});

test('Auntie Akos yellow falls back to dark text and darker ink', () => {
  const theme = deriveTheme('#FFC21A');
  expect(theme.onAccent).toBe('#111111');
  expect(theme.ratios.buttonText).toBe(11.67);
  expect(contrast('#FFFFFF', theme.accent)).toBeCloseTo(1.62, 2);
  expect(theme.ink).toBe('#94710F');
  expect(theme.ratios.inkOnWhite).toBe(4.54);
  expect(theme.badgeInk).toBe('#8E6C0E');
  expect(theme.ratios.badge).toBe(4.53);
  expect(theme.tooCloseToCravins).toBe(false);
});

test('Cravins orange carries white text and warns when a venue copies it', () => {
  const own = deriveTheme('#D24000');
  expect(own.onAccent).toBe('#FFFFFF');
  expect(own.ratios.buttonText).toBeGreaterThanOrEqual(4.5);
  expect(own.tooCloseToCravins).toBe(true);
  expect(deriveTheme().isDefault).toBe(true);
  expect(deriveTheme().ratios.buttonText).toBeGreaterThanOrEqual(4.5);
  expect(deriveTheme().tooCloseToCravins).toBe(false);
});

test('every pair stays at 4.5:1 across 500 colours', () => {
  let seed = 20261031;
  const next = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  for (let index = 0; index < 500; index += 1) {
    const hex =
      '#' +
      [0, 1, 2]
        .map(() =>
          Math.floor(next() * 256)
            .toString(16)
            .padStart(2, '0'),
        )
        .join('');
    const theme = deriveTheme(hex);
    expect(pairsPass(theme)).toBe(true);
  }
});
