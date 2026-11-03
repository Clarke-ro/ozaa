import { asGhanaPhone, countryForVenue, formatPhone, parseGhanaPhone, parsePhone } from './phone';

test('accepts the ways a guest types a Ghana number', () => {
  expect(parsePhone('024 400 0001')?.phone).toBe('+233244000001');
  expect(parsePhone('244000001')?.phone).toBe('+233244000001');
  expect(parsePhone('+233 24 400 0001')?.phone).toBe('+233244000001');
  expect(parsePhone('233244000001')?.phone).toBe('+233244000001');
  expect(parseGhanaPhone('0244000001')?.phone).toBe('+233244000001');
  expect(asGhanaPhone(parsePhone('0244000001'))).toBe('+233244000001');
});

test('guesses the MoMo network for Ghana and still lets the guest change it', () => {
  expect(parsePhone('0244000001')?.provider).toBe('mtn');
  expect(parsePhone('0204000001')?.provider).toBe('vod');
  expect(parsePhone('0274000001')?.provider).toBe('atl');
  expect(parsePhone('0234000001')?.provider).toBeNull();
});

test('groups a stored number the way that country dials it', () => {
  expect(formatPhone('+233244000001')).toBe('024 400 0001');
  expect(formatPhone('+2348012345678')).toBe('0801 234 5678');
  expect(formatPhone('+254712345678')).toBe('0712 345 678');
  expect(formatPhone('+27821234567')).toBe('082 123 4567');
  expect(formatPhone('+14155550100')).toBe('+1 415 555 0100');
});

test('rejects a short number', () => {
  expect(parsePhone('0244')).toBeNull();
});

test('does not rewrite another country onto the Ghana code and accepts E.164 wire phones', () => {
  expect(parsePhone('0803 123 4567', 'NG')?.phone).toBe('+2348031234567');
  expect(parsePhone('0803 123 4567', 'NG')?.provider).toBeNull();
  expect(asGhanaPhone(parsePhone('0803 123 4567', 'NG'))).toBe('+2348031234567');
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
