import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Venue secrets (each restaurant's Paystack secret key) are stored sealed with AES-256-GCM.
 * GCM both hides the text and detects any change to it: a tampered or wrongly keyed value throws
 * instead of opening into a wrong key. The encryption key lives only in the server's settings
 * (ENCRYPTION_KEY), never in the database, so a copy of the database alone reveals no keys.
 *
 * Stored form: v1.<iv>.<tag>.<ciphertext>, each part base64url. "v1" lets us change the scheme later.
 */
export function encryptionKey(hex: string): Buffer {
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes).');
  return Buffer.from(hex, 'hex');
}

export function sealSecret(key: Buffer, text: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const body = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return ['v1', iv, cipher.getAuthTag(), body].map((part) => (typeof part === 'string' ? part : part.toString('base64url'))).join('.');
}

export function openSecret(key: Buffer, sealed: string): string {
  const [version, iv, tag, body] = sealed.split('.');
  if (version !== 'v1' || !iv || !tag || !body) throw new Error('Not a sealed secret.');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(body, 'base64url')), decipher.final()]).toString('utf8');
}

/** What the owner app may show of a secret: its last 4 characters. */
export function secretHint(secret: string): string {
  return `••••${secret.slice(-4)}`;
}
