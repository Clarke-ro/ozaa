import { eq } from 'drizzle-orm';
import type { Db } from '../db/client.ts';
import { paymentSettings, venues } from '../db/schema.ts';
import type { Paystack } from '../paystack.ts';
import { NO_MANUAL } from './venueData.ts';
import { openSecret, sealSecret, secretHint } from '../secrets/sealed.ts';

/** A venue's own Paystack account, ready to charge. Money lands in that venue's account. */
export type VenuePaystack = { paystack: Paystack; secret: string; testMode: boolean };

export type PaystackKeys = { mode: 'test' | 'live'; publicKey: string; secretKey: string };

/**
 * Finds and opens each venue's Paystack keys. Cravins never charges with a key of its own: every
 * payment uses the key of the venue whose bill it is (AGENTS.md rule 5, BUILD.md section 4).
 */
export function venuePaystack(deps: { db: Db; key: Buffer; client: (secret: string) => Paystack }) {
  const { db, key } = deps;

  async function forVenueId(venueId: string): Promise<VenuePaystack | null> {
    const [row] = await db.select().from(paymentSettings).where(eq(paymentSettings.venueId, venueId));
    // Sandbox only until Clarke says otherwise (AGENTS.md rule 5): live keys don't charge yet.
    if (!row?.paystackSecretEncrypted || row.paystackMode !== 'test') return null;
    const secret = openSecret(key, row.paystackSecretEncrypted);
    return { paystack: deps.client(secret), secret, testMode: row.paystackMode === 'test' };
  }

  return {
    forVenueId,

    async forVenueSlug(slug: string): Promise<VenuePaystack | null> {
      const [venue] = await db.select({ id: venues.id }).from(venues).where(eq(venues.slug, slug));
      return venue ? forVenueId(venue.id) : null;
    },

    /** Stores keys that were already checked: the secret sealed, only its last 4 kept in the clear. */
    async save(venueId: string, keys: PaystackKeys, now: number): Promise<void> {
      const values = {
        paystackMode: keys.mode,
        paystackPublicKey: keys.publicKey,
        paystackSecretEncrypted: sealSecret(key, keys.secretKey),
        paystackSecretHint: secretHint(keys.secretKey),
        paystackConnectedAt: new Date(now),
        updatedAt: new Date(now),
      };
      await db
        .insert(paymentSettings)
        .values({ venueId, manual: NO_MANUAL, ...values })
        .onConflictDoUpdate({ target: paymentSettings.venueId, set: values });
    },

    async remove(venueId: string, now: number): Promise<void> {
      await db
        .update(paymentSettings)
        .set({
          paystackMode: null,
          paystackPublicKey: null,
          paystackSecretEncrypted: null,
          paystackSecretHint: null,
          paystackConnectedAt: null,
          updatedAt: new Date(now),
        })
        .where(eq(paymentSettings.venueId, venueId));
    },
  };
}

export type VenuePaystackStore = ReturnType<typeof venuePaystack>;
