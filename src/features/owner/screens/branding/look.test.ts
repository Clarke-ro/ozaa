import { buttonLook, normaliseHex } from './look';

test('hex input is tidied', () => {
  expect(normaliseHex(' d24000 ')).toBe('#D24000');
  expect(normaliseHex('#abc')).toBe('#abc');
});

test('auto always picks a readable label', () => {
  for (const accent of ['#D24000', '#FFC21A', '#111111', '#7DD3FC'])
    expect(buttonLook(accent, 'auto').readable).toBe(true);
});

test('forcing white text on a pale colour is flagged', () => {
  expect(buttonLook('#FFC21A', 'light').readable).toBe(false);
});
