import type { Db } from '../db/client.ts';
import type { Paystack } from '../paystack.ts';
import { encryptionKey } from '../secrets/sealed.ts';
import { venuePaystack } from '../venues/venuePaystack.ts';

export const TEST_KEY = encryptionKey('a'.repeat(64));
export const VENUE_SECRET = 'sk_test_venuesecret1234';

/** Connects a venue to Paystack the way the owner app will: sealed secret, last 4 shown. */
export async function connectTestPaystack(db: Db, venueId: string, client: (secret: string) => Paystack = () => ({}) as Paystack) {
  const keys = venuePaystack({ db, key: TEST_KEY, client });
  await keys.save(venueId, { mode: 'test', publicKey: 'pk_test_abcdefghij', secretKey: VENUE_SECRET }, Date.now());
  return keys;
}
