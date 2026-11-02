import { parseGhanaPhone } from './phone';

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

test('rejects a short number', () => {
  expect(parseGhanaPhone('0244')).toBeNull();
});
