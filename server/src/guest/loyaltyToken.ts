import { openSecret, sealSecret } from '../secrets/sealed.ts';

// A guest stays signed in to their loyalty card on that phone for this long.
export const LOYALTY_TTL_MS = 30 * 86_400_000;

/**
 * The loyalty token proves a guest's phone. It is sealed with the server's encryption key
 * (AES-256-GCM), so the number inside can't be read or changed by anyone holding the token.
 */
export function signLoyaltyToken(key: Buffer, phone: string, exp: number): string {
  return `lty.${sealSecret(key, JSON.stringify({ phone, exp }))}`;
}

/** The proved phone, or null when the token is missing, tampered with or expired. */
export function readLoyaltyToken(key: Buffer, token: string | undefined, now: number): string | null {
  if (!token?.startsWith('lty.')) return null;
  try {
    const { phone, exp } = JSON.parse(openSecret(key, token.slice(4))) as { phone: string; exp: number };
    return exp > now && /^\+233\d{9}$/.test(phone) ? phone : null;
  } catch {
    return null;
  }
}
