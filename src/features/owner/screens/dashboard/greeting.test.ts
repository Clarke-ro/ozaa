import { dayPart } from './greeting';

test('before noon is morning', () => {
  expect(dayPart(0)).toBe('morning');
  expect(dayPart(11)).toBe('morning');
});

test('noon until five is afternoon', () => {
  expect(dayPart(12)).toBe('afternoon');
  expect(dayPart(16)).toBe('afternoon');
});

test('five onwards is evening, which covers a late dinner service', () => {
  expect(dayPart(17)).toBe('evening');
  expect(dayPart(23)).toBe('evening');
});
