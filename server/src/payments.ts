import { randomUUID } from 'node:crypto';
import type { PaymentStore } from './db/paymentStore.ts';
import { Problem } from './http/problem.ts';
import { PaystackError, type Paystack } from './paystack.ts';
import { fromPaystack, type PaymentStatus, type PaystackTransaction } from './status.ts';

/** A payment as the contract describes it (api/openapi.yaml Payment). */
export type Payment = {
  id: string;
  reference: string;
  orderId: string;
  method: 'momo' | 'card';
  provider?: 'mtn' | 'vod' | 'atl';
  amountPesewas: number;
  tipPesewas: number;
  feePesewas: number;
  currency: 'GHS';
  status: PaymentStatus;
  displayText?: string;
  authorizationUrl?: string;
  approveBy: string | null;
  failureReason?: string;
  createdAt: string;
  paidAt: string | null;
  testMode: boolean;
};

/** What a bill quote (made by the server, see orders/billQuote.ts) says this payment is for. */
export type Charge = {
  orderId: string;
  venueSlug: string;
  quoteId: string | null;
  amountPesewas: number;
  tipPesewas: number;
  feePesewas: number;
};

/** The Paystack account of the venue whose bill it is, or null when the venue hasn't connected one. */
export type PaystackFor = (
  venueSlug: string,
) => Promise<{ paystack: Paystack; secret: string; testMode: boolean } | null>;

export type StartInput = {
  charge: Charge;
  method: 'momo' | 'card';
  momo?: { phone: string; provider: 'mtn' | 'vod' | 'atl' };
  email?: string;
};

// MoMo networks give the guest 180 seconds to approve (POST /payments in the contract).
const APPROVE_MS = 180_000;
// While the guest waits, a GET asks Paystack again at most this often (no webhooks on a laptop).
const REFRESH_MS = 5_000;
// Paystack needs an email; guests don't give one, so the contract allows a placeholder.
const PLACEHOLDER_EMAIL = 'guest@cravins.app';
const MISMATCH = 'The amount did not match, so nothing was counted.';
// The re-check (BUILD.md 5.4): a payment still open 5 minutes after it started, or since it was
// last asked about, is checked with Paystack. A MoMo approval times out after 3 minutes, so by
// then Paystack has usually decided. After a day we stop: the webhook or the guest covers it.
const RECHECK_QUIET_MS = 5 * 60_000;
const RECHECK_MAX_AGE_MS = 24 * 60 * 60_000;
const RECHECK_BATCH = 50;

/**
 * Payments, kept in Postgres (store) so a restart or another copy of the server still knows them.
 * Only Paystack's word moves a payment to succeeded.
 */
export function paymentService(deps: {
  paystackFor: PaystackFor;
  store: PaymentStore;
  siteUrl: string;
  now?: () => number;
  newReference?: () => string;
}) {
  const { store } = deps;
  const now = deps.now ?? Date.now;
  const newReference = deps.newReference ?? (() => `pay_${randomUUID().replaceAll('-', '')}`);

  const apply = async (payment: Payment, tx: PaystackTransaction): Promise<Payment> => {
    if (payment.status === 'succeeded' || payment.status === 'failed') return payment;
    // Abandoned is not the end for a card: the guest can go back to Paystack's page and pay.
    // Only a success (checked for amount below) moves it on; anything else leaves it abandoned.
    if (payment.status === 'abandoned' && tx.status !== 'success') return payment;
    const next = fromPaystack(
      tx,
      { amountPesewas: payment.amountPesewas, currency: 'GHS' },
      payment.status,
    );
    const updated: Payment = {
      ...payment,
      status: next.status,
      failureReason:
        next.failureReason === 'amount_mismatch'
          ? MISMATCH
          : (next.failureReason ?? payment.failureReason),
      paidAt: next.status === 'succeeded' ? new Date(now()).toISOString() : payment.paidAt,
    };
    await store.save(updated);
    return updated;
  };

  const ask = async (payment: Payment, venueSlug: string): Promise<Payment> => {
    const venue = await deps.paystackFor(venueSlug);
    // The venue disconnected Paystack since: we can't ask, so we keep what we know.
    if (!venue) return payment;
    await store.asked(payment.reference, now());
    try {
      return await apply(payment, await venue.paystack.verify(payment.reference));
    } catch (error) {
      // A slow Paystack is not a failed payment. The next poll, or the webhook, asks again.
      if (error instanceof PaystackError && error.httpStatus === 503) return payment;
      throw error;
    }
  };

  /** Asks Paystack to start the charge for a claimed payment. Never throws: a refusal is saved as failed. */
  const charge = async (base: Payment, input: StartInput, paystack: Paystack): Promise<Payment> => {
    const email = input.email ?? PLACEHOLDER_EMAIL;
    let payment: Payment;
    try {
      if (input.method === 'momo' && input.momo) {
        const res = await paystack.chargeMomo({
          email,
          amountPesewas: base.amountPesewas,
          reference: base.reference,
          ...input.momo,
        });
        payment = { ...base, status: 'pay_offline', displayText: res.display_text };
      } else {
        const res = await paystack.initializeCard({
          email,
          amountPesewas: base.amountPesewas,
          reference: base.reference,
          callbackUrl: `${deps.siteUrl.replace(/\/+$/, '')}/${input.charge.venueSlug}/pay`,
        });
        payment = { ...base, status: 'open_url', authorizationUrl: res.authorization_url };
      }
    } catch (error) {
      // The charge may already have reached Paystack. Leave it pending so a webhook can still
      // mark it paid, and tell the guest to wait instead of recording a failure.
      if (error instanceof PaystackError && error.httpStatus === 503) {
        throw new Problem(
          503,
          'paystack_unavailable',
          'Paystack took too long. Wait a moment, then check the payment.',
        );
      }
      payment = { ...base, status: 'failed', failureReason: (error as PaystackError).message };
    }
    await store.save(payment);
    await store.asked(payment.reference, now());
    return payment;
  };

  return {
    /**
     * POST /payments. The same Idempotency-Key always gives back the same payment: the key is
     * claimed in Postgres before Paystack is called, so a second tap never starts a second charge.
     */
    async start(input: StartInput, idempotencyKey: string): Promise<Payment> {
      const venue = await deps.paystackFor(input.charge.venueSlug);
      if (!venue)
        throw new Problem(
          409,
          'online_pay_off',
          'Pay at the counter, or ask your waiter for the bill.',
        );
      const reference = newReference();
      const created = now();
      const base: Payment = {
        id: reference,
        reference,
        orderId: input.charge.orderId,
        method: input.method,
        provider: input.momo?.provider,
        amountPesewas: input.charge.amountPesewas,
        tipPesewas: input.charge.tipPesewas,
        feePesewas: input.charge.feePesewas,
        currency: 'GHS',
        status: 'pending',
        approveBy: input.method === 'momo' ? new Date(created + APPROVE_MS).toISOString() : null,
        createdAt: new Date(created).toISOString(),
        paidAt: null,
        testMode: venue.testMode,
      };
      const claim = await store.claim(
        idempotencyKey,
        base,
        input.charge.venueSlug,
        input.charge.quoteId,
      );
      // A repeat: the latest word on the first payment, in case it has moved on since it started.
      if (!claim.created)
        return (await store.get(claim.payment.reference))?.payment ?? claim.payment;
      return charge(claim.payment, input, venue.paystack);
    },

    /** GET /payments/{ref}: what we know, refreshed from Paystack every few seconds while open. */
    async get(reference: string): Promise<Payment | null> {
      const found = await store.get(reference);
      if (!found) return null;
      const { payment, lastAskedAt, venueSlug } = found;
      const open = payment.status === 'pay_offline' || payment.status === 'open_url';
      if (open && now() - (lastAskedAt ?? 0) >= REFRESH_MS) return ask(payment, venueSlug);
      return payment;
    },

    /** POST /payments/{ref}/verify: ask Paystack now. */
    async verify(reference: string): Promise<Payment | null> {
      const found = await store.get(reference);
      return found ? ask(found.payment, found.venueSlug) : null;
    },

    /**
     * Asks Paystack about payments that are still open after 5 minutes, because the guest left
     * or the webhook never arrived. Uses the same rules as the guest's own check, so only a
     * matching success counts and the money is added once. One failure doesn't stop the rest.
     */
    async recheckStale(onError?: (error: unknown) => void): Promise<{ checked: number; errors: number }> {
      const due = await store.stale(now(), {
        quietMs: RECHECK_QUIET_MS,
        maxAgeMs: RECHECK_MAX_AGE_MS,
        limit: RECHECK_BATCH,
      });
      let errors = 0;
      for (const { payment, venueSlug } of due) {
        try {
          await ask(payment, venueSlug);
        } catch (error) {
          errors += 1;
          onError?.(error);
        }
      }
      return { checked: due.length, errors };
    },

    /** The secret of the venue a payment belongs to: Paystack signs that venue's webhooks with it. */
    async webhookSecret(reference: string): Promise<string | null> {
      const found = await store.get(reference);
      return found ? ((await deps.paystackFor(found.venueSlug))?.secret ?? null) : null;
    },

    /** A signed webhook told us about a transaction. Unknown references are ignored. */
    async fromWebhook(reference: string, tx: PaystackTransaction): Promise<Payment | null> {
      const found = await store.get(reference);
      return found ? apply(found.payment, tx) : null;
    },
  };
}

export type PaymentService = ReturnType<typeof paymentService>;
