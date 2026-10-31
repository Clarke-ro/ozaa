const encoder = new TextEncoder();

/** Paystack signs the raw body with HMAC-SHA512 and sends it in x-paystack-signature. */
export async function signPaystackBody(rawBody: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function verifyPaystackSignature(rawBody: string, header: string | null, secret: string): Promise<boolean> {
  if (!header || !secret) return false;
  const expected = await signPaystackBody(rawBody, secret);
  if (expected.length !== header.length) return false;
  let mismatch = 0;
  for (let index = 0; index < expected.length; index += 1) {
    mismatch |= expected.charCodeAt(index) ^ header.charCodeAt(index);
  }
  return mismatch === 0;
}
