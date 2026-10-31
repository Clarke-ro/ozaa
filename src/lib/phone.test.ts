import { formatPhone, parseGhanaPhone } from './phone';

test('accepts the ways a guest types a Ghana number', () => {
  expect(parseGhanaPhone('024 400 0001')?.phone).toBe('+233244000001');
  expect(parseGhanaPhone('244000001')?.phone).toBe('+233244000001');
  expect(parseGhanaPhone('+233 24 400 0001')?.phone).toBe('+233244000001');
  expect(parseGhanaPhone('233244000001')?.phone).toBe('+233244000001');
});

test('guesses the MoMo network and still lets the guest change it', () => {
  expect(parseGhanaPhone('0244000001')?.provider).toBe('mtn');
  expect(parseGhanaPhone('0204000001')?.provider).toBe('vod');
  expect(parseGhanaPhone('0274000001')?.provider).toBe('atl');
  expect(parseGhanaPhone('0234000001')?.provider).toBeNull();
});

test('groups a stored number the way that country dials it', () => {
  expect(formatPhone('+233244000001')).toBe('024 400 0001');
  expect(formatPhone('+2348012345678')).toBe('0801 234 5678');
  expect(formatPhone('+254712345678')).toBe('0712 345 678');
  expect(formatPhone('+27821234567')).toBe('082 123 4567');
  expect(formatPhone('+14155550100')).toBe('+1 415 555 0100');
});

test('rejects a short number', () => {
  expect(parseGhanaPhone('0244')).toBeNull();
});
