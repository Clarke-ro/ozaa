import { ghanaPhone, isGhanaPhone, type GhanaPhone } from './brand';

export type MomoProvider = 'mtn' | 'vod' | 'atl';

/**
 * Ghana MoMo prefixes. They change when the networks sell new ranges.
 * MTN, Telecel (vod) and AT (atl) are the Paystack provider codes.
 * Sources checked Oct 2026: the common 0XX ranges guests still type.
 * This table is the Ghana profile only.
 */
const GHANA_PREFIXES: Record<string, MomoProvider> = {
  '24': 'mtn',
  '25': 'mtn',
  '53': 'mtn',
  '54': 'mtn',
  '55': 'mtn',
  '59': 'mtn',
  '20': 'vod',
  '50': 'vod',
  '26': 'atl',
  '27': 'atl',
  '56': 'atl',
  '57': 'atl',
};

/** National length is the digits after the trunk 0, not counting the calling code. */
const COUNTRIES: Record<string, { calling: string; digits: number }> = {
  GH: { calling: '233', digits: 9 },
  NG: { calling: '234', digits: 10 },
  KE: { calling: '254', digits: 9 },
  TZ: { calling: '255', digits: 9 },
  SN: { calling: '221', digits: 9 },
  ZA: { calling: '27', digits: 9 },
  EG: { calling: '20', digits: 10 },
  FR: { calling: '33', digits: 9 },
  PT: { calling: '351', digits: 9 },
  ES: { calling: '34', digits: 9 },
};

const NATIONAL: { calling: string; groups: number[] }[] = [
  { calling: '233', groups: [3, 3, 4] },
  { calling: '234', groups: [4, 3, 4] },
  { calling: '254', groups: [4, 3, 3] },
  { calling: '27', groups: [3, 3, 4] },
];

function groupDigits(value: string, sizes: number[]): string {
  const parts: string[] = [];
  let index = 0;
  for (const size of sizes) {
    parts.push(value.slice(index, index + size));
    index += size;
  }
  return parts.join(' ');
}

/** Display only. Storage stays E.164. Ghana, Nigeria, Kenya and South Africa use a leading 0. */
export function formatPhone(e164: string): string {
  const digits = e164.replace(/[^\d]/g, '');
  const regions = [...NATIONAL].sort((left, right) => right.calling.length - left.calling.length);
  for (const region of regions) {
    if (!digits.startsWith(region.calling)) continue;
    const national = `0${digits.slice(region.calling.length)}`;
    const expected = region.groups.reduce((sum, size) => sum + size, 0);
    if (national.length !== expected) break;
    return groupDigits(national, region.groups);
  }
  if (digits.startsWith('1') && digits.length === 11)
    return `+1 ${groupDigits(digits.slice(1), [3, 3, 4])}`;
  return e164.startsWith('+') ? e164 : `+${digits}`;
}

/** Accra sample. A venue with no country still parses Ghana numbers. */
export const DEFAULT_COUNTRY = 'GH';

const TIMEZONE_COUNTRY: Record<string, string> = {
  'Africa/Accra': 'GH',
  'Africa/Lagos': 'NG',
  'Africa/Nairobi': 'KE',
  'Africa/Dar_es_Salaam': 'TZ',
  'Africa/Dakar': 'SN',
  'Africa/Johannesburg': 'ZA',
  'Africa/Cairo': 'EG',
  'Europe/Paris': 'FR',
  'Europe/Lisbon': 'PT',
  'Europe/Madrid': 'ES',
};

const CURRENCY_COUNTRY: Record<string, string> = {
  GHS: 'GH',
  NGN: 'NG',
  KES: 'KE',
  TZS: 'TZ',
  XOF: 'SN',
  ZAR: 'ZA',
  EGP: 'EG',
  EUR: 'FR',
};

export type ParsedPhone = { phone: GhanaPhone; country: string; provider: MomoProvider | null };

export function countryForVenue(input: { timezone?: string; currency?: string }): string {
  const fromZone = input.timezone ? TIMEZONE_COUNTRY[input.timezone] : undefined;
  if (fromZone) return fromZone;
  const fromCurrency = input.currency ? CURRENCY_COUNTRY[input.currency] : undefined;
  if (fromCurrency) return fromCurrency;
  return DEFAULT_COUNTRY;
}

/**
 * Turns what a guest typed into E.164.
 * Ghana is the default: 024…, 24…, +233… and 233… become +233…, with a MoMo guess.
 * Another country is not rewritten onto +233. An unknown country returns null.
 */
export function parsePhone(input: string, country: string = DEFAULT_COUNTRY): ParsedPhone | null {
  const trimmed = input.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;

  if (trimmed.startsWith('+')) {
    const match = matchCallingCode(digits);
    if (!match) return null;
    return finish(match.country, match.national);
  }

  const profile = COUNTRIES[country];
  if (!profile) return null;
  let national = digits;
  if (
    national.startsWith(profile.calling) &&
    national.length === profile.calling.length + profile.digits
  ) {
    national = national.slice(profile.calling.length);
  } else if (national.startsWith('0')) {
    national = national.slice(1);
  }
  if (national.length !== profile.digits) return null;
  return finish(country, national);
}

/** Parses a Ghana local number or international +E.164 number. */
export function parseGhanaPhone(
  input: string,
  country: string = DEFAULT_COUNTRY,
): ParsedPhone | null {
  return parsePhone(input, country);
}

/** Validates and returns the branded E.164 phone for API calls. */
export function asGhanaPhone(parsed: ParsedPhone | null): GhanaPhone | null {
  if (!parsed || !isGhanaPhone(parsed.phone)) return null;
  return parsed.phone;
}

function matchCallingCode(digits: string): { country: string; national: string } | null {
  const entries = Object.entries(COUNTRIES).sort(
    (a, b) => b[1].calling.length - a[1].calling.length,
  );
  for (const [country, profile] of entries) {
    if (!digits.startsWith(profile.calling)) continue;
    const national = digits.slice(profile.calling.length);
    if (national.length === profile.digits) return { country, national };
  }
  return null;
}

function finish(country: string, national: string): ParsedPhone | null {
  const profile = COUNTRIES[country];
  if (!profile) return null;
  const phone = `+${profile.calling}${national}`;
  if (!isGhanaPhone(phone)) return null;
  return {
    phone: ghanaPhone(phone),
    country,
    provider: country === 'GH' ? (GHANA_PREFIXES[national.slice(0, 2)] ?? null) : null,
  };
}
