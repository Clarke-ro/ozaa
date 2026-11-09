import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Paystack signs every webhook: `x-paystack-signature` is an HMAC-SHA512 of the raw body, made
 * with the secret key. Anything else could be anyone, so it is ignored. The compare takes the same
 * time whatever the input, so the signature can't be guessed one character at a time.
 */
export function isFromPaystack(rawBody: string, signature: string | undefined, secret: string): boolean {
  if (!signature || !/^[0-9a-f]+$/i.test(signature)) return false;
  const expected = createHmac('sha512', secret).update(rawBody).digest();
  const given = Buffer.from(signature, 'hex');
  return given.length === expected.length && timingSafeEqual(given, expected);
}
