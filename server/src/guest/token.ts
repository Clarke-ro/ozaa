import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

/** What a guest token says: which visit, at which venue, at which table (null: the venue's link). */
export type GuestClaims = { sid: string; venueId: string; tableCode: string | null; exp: number };

// The contract: a guest session lasts 4 hours (guestAuth).
export const GUEST_TTL_MS = 4 * 3600_000;

const b64 = (text: string) => Buffer.from(text).toString('base64url');

/**
 * Guest tokens are signed, not stored: the server can check one without a database read, and a
 * guest can't change their table or venue without breaking the signature. No personal data.
 */
export function signGuestToken(secret: string, claims: Omit<GuestClaims, 'sid'> & { sid?: string }): string {
  const full: GuestClaims = { sid: claims.sid ?? randomUUID(), ...claims };
  const payload = b64(JSON.stringify(full));
  const sig = createHmac('sha256', secret).update(payload).digest('base64url');
  return `gst.${payload}.${sig}`;
}

/** The claims, or null for a token that is missing, forged, malformed or expired. */
export function readGuestToken(secret: string, token: string | undefined, now: number): GuestClaims | null {
  if (!token?.startsWith('gst.')) return null;
  const [, payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = createHmac('sha256', secret).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as GuestClaims;
    return typeof claims.exp === 'number' && claims.exp > now ? claims : null;
  } catch {
    return null;
  }
}
