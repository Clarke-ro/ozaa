import { randomBytes, scrypt, timingSafeEqual, type BinaryLike } from 'node:crypto';

// A 4-digit PIN has only 10,000 values, so the hash alone can't protect it from someone holding
// the database: the five-tries rule (routes/staffPin.ts) is the real guard. The slow, salted hash
// still means a leaked table doesn't hand out PINs at a glance, and no two people share a hash.
const KEY_LENGTH = 32;
const COST = 2 ** 14;

function derive(pin: string, salt: BinaryLike): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(pin, salt, KEY_LENGTH, { N: COST }, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}

/** Stored as `scrypt$<salt>$<hash>`, both base64. */
export async function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(pin, salt);
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`;
}

/** True only when `pin` matches a hash made by hashPin. Compared in constant time. */
export async function checkPin(pin: string, stored: string): Promise<boolean> {
  const [kind, salt, hash] = stored.split('$');
  if (kind !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64');
  const actual = await derive(pin, Buffer.from(salt, 'base64'));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
