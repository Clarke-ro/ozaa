import { ghanaPhone, type GhanaPhone } from './brand';

export type MomoProvider = 'mtn' | 'vod' | 'atl';

/**
 * Prefixes change when the networks sell new ranges. Keep this table in one place.
 * MTN, Telecel (vod) and AT (atl) are the Paystack provider codes.
 * Sources checked Oct 2026: the common 0XX ranges guests still type.
 */
const PREFIXES: Record<string, MomoProvider> = {
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

export type ParsedPhone = { phone: GhanaPhone; provider: MomoProvider | null };

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
  if (digits.startsWith('1') && digits.length === 11) return `+1 ${groupDigits(digits.slice(1), [3, 3, 4])}`;
  return e164.startsWith('+') ? e164 : `+${digits}`;
}

/** Accepts 024…, 24…, +233 24… and 233…. Stores +23324…. */
export function parseGhanaPhone(input: string): ParsedPhone | null {
  const digits = input.replace(/[^\d+]/g, '');
  let local = digits;
  if (local.startsWith('+233')) local = local.slice(4);
  else if (local.startsWith('233')) local = local.slice(3);
  else if (local.startsWith('0')) local = local.slice(1);
  if (!/^\d{9}$/.test(local)) return null;
  const prefix = local.slice(0, 2);
  return { phone: ghanaPhone(`+233${local}`), provider: PREFIXES[prefix] ?? null };
}
