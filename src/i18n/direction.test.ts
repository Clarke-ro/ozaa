import { textDirection } from './direction';

test('Arabic is the right-to-left language', () => {
  expect(textDirection('ar')).toBe('rtl');
  expect(textDirection('ar-EG')).toBe('rtl');
  expect(textDirection('en')).toBe('ltr');
  expect(textDirection('fr')).toBe('ltr');
  expect(textDirection('sw')).toBe('ltr');
  expect(textDirection(undefined)).toBe('ltr');
});
