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
