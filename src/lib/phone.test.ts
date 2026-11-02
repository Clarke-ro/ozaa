import { asGhanaPhone, countryForVenue, parsePhone } from './phone';

test('accepts the ways a guest types a Ghana number', () => {
  expect(parsePhone('024 400 0001')?.phone).toBe('+233244000001');
  expect(parsePhone('244000001')?.phone).toBe('+233244000001');
  expect(parsePhone('+233 24 400 0001')?.phone).toBe('+233244000001');
  expect(parsePhone('233244000001')?.phone).toBe('+233244000001');
  expect(asGhanaPhone(parsePhone('0244000001'))).toBe('+233244000001');
});

test('guesses the MoMo network for Ghana and still lets the guest change it', () => {
  expect(parsePhone('0244000001')?.provider).toBe('mtn');
  expect(parsePhone('0204000001')?.provider).toBe('vod');
  expect(parsePhone('0274000001')?.provider).toBe('atl');
  expect(parsePhone('0234000001')?.provider).toBeNull();
});

test('rejects a short number', () => {
  expect(parsePhone('0244')).toBeNull();
});

test('does not rewrite another country onto the Ghana code', () => {
  expect(parsePhone('0803 123 4567', 'NG')?.phone).toBe('+2348031234567');
  expect(parsePhone('0803 123 4567', 'NG')?.provider).toBeNull();
  expect(asGhanaPhone(parsePhone('0803 123 4567', 'NG'))).toBeNull();
  expect(parsePhone('+221 77 123 45 67', 'GH')?.phone).toBe('+221771234567');
  expect(parsePhone('06 12 34 56 78', 'FR')?.phone).toBe('+33612345678');
  expect(parsePhone('4155552671', 'US')).toBeNull();
});

test('picks a country from the venue, and Ghana when the venue does not say', () => {
  expect(countryForVenue({ timezone: 'Africa/Accra', currency: 'GHS' })).toBe('GH');
  expect(countryForVenue({ timezone: 'Africa/Lagos', currency: 'NGN' })).toBe('NG');
  expect(countryForVenue({ currency: 'KES' })).toBe('KE');
  expect(countryForVenue({})).toBe('GH');
});
