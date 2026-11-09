import { randomUUID } from 'node:crypto';
import type { Paystack, PaystackError } from './paystack.ts';
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

/** What the bill quote says this payment is for (see app.ts on where this comes from in 2b). */
export type Charge = {
  orderId: string;
  venueSlug: string;
  amountPesewas: number;
  tipPesewas: number;
};

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

/**
 * Payments for the 2b slice, kept in memory: a restart forgets them, which is fine for sandbox
 * testing. Phase 5 moves this to Postgres. Only Paystack's word moves a payment to succeeded.
 */
export function paymentService(deps: {
  paystack: Paystack;
  siteUrl: string;
  testMode: boolean;
  now?: () => number;
  newReference?: () => string;
}) {
  const now = deps.now ?? Date.now;
  const newReference = deps.newReference ?? (() => `pay_${randomUUID().replaceAll('-', '')}`);
  const payments = new Map<string, Payment>();
  const lastAsked = new Map<string, number>();
  // Idempotency-Key → the start in progress or done. Saved before Paystack is called, so a second
  // tap that lands while the first is still waiting on Paystack gets the same payment.
  const byKey = new Map<string, Promise<Payment>>();

  const apply = (payment: Payment, tx: PaystackTransaction): Payment => {
    if (payment.status === 'succeeded' || payment.status === 'failed') return payment;
    // Abandoned is not the end for a card: the guest can go back to Paystack's page and pay.
    // Only a success (checked for amount below) moves it on; anything else leaves it abandoned.
    if (payment.status === 'abandoned' && tx.status !== 'success') return payment;
    const next = fromPaystack(tx, { amountPesewas: payment.amountPesewas, currency: 'GHS' }, payment.status);
    const updated: Payment = {
      ...payment,
      status: next.status,
      failureReason:
        next.failureReason === 'amount_mismatch' ? MISMATCH : (next.failureReason ?? payment.failureReason),
      paidAt: next.status === 'succeeded' ? new Date(now()).toISOString() : payment.paidAt,
    };
    payments.set(payment.reference, updated);
    return updated;
  };

  const ask = async (payment: Payment): Promise<Payment> => {
    lastAsked.set(payment.reference, now());
    return apply(payment, await deps.paystack.verify(payment.reference));
  };

  /** Asks Paystack to start the charge and records the payment, failed or not. Never throws. */
  const create = async (input: StartInput): Promise<Payment> => {
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
      currency: 'GHS',
      status: 'pending',
      approveBy: input.method === 'momo' ? new Date(created + APPROVE_MS).toISOString() : null,
      createdAt: new Date(created).toISOString(),
      paidAt: null,
      testMode: deps.testMode,
    };
    const email = input.email ?? PLACEHOLDER_EMAIL;
    let payment: Payment;
    try {
      if (input.method === 'momo' && input.momo) {
        const res = await deps.paystack.chargeMomo({
          email,
          amountPesewas: base.amountPesewas,
          reference,
          ...input.momo,
        });
        payment = { ...base, status: 'pay_offline', displayText: res.display_text };
      } else {
        const res = await deps.paystack.initializeCard({
          email,
          amountPesewas: base.amountPesewas,
          reference,
          callbackUrl: `${deps.siteUrl.replace(/\/+$/, '')}/${input.charge.venueSlug}/pay`,
        });
        payment = { ...base, status: 'open_url', authorizationUrl: res.authorization_url };
      }
    } catch (error) {
      payment = { ...base, status: 'failed', failureReason: (error as PaystackError).message };
    }
    payments.set(reference, payment);
    lastAsked.set(reference, now());
    return payment;
  };

  return {
    /** POST /payments. The same Idempotency-Key always gives back the same payment. */
    async start(input: StartInput, idempotencyKey: string): Promise<Payment> {
      const seen = byKey.get(idempotencyKey);
      if (seen) {
        const first = await seen;
        // The latest word on it, in case it has moved on since it started.
        return payments.get(first.reference) ?? first;
      }
      const started = create(input);
      byKey.set(idempotencyKey, started);
      return started;
    },

    /** GET /payments/{ref}: what we know, refreshed from Paystack every few seconds while open. */
    async get(reference: string): Promise<Payment | null> {
      const payment = payments.get(reference);
      if (!payment) return null;
      const open = payment.status === 'pay_offline' || payment.status === 'open_url';
      if (open && now() - (lastAsked.get(reference) ?? 0) >= REFRESH_MS) return ask(payment);
      return payment;
    },

    /** POST /payments/{ref}/verify: ask Paystack now. */
    async verify(reference: string): Promise<Payment | null> {
      const payment = payments.get(reference);
      return payment ? ask(payment) : null;
    },

    /** A signed webhook told us about a transaction. Unknown references are ignored. */
    fromWebhook(reference: string, tx: PaystackTransaction): Payment | null {
      const payment = payments.get(reference);
      return payment ? apply(payment, tx) : null;
    },
  };
}

export type PaymentService = ReturnType<typeof paymentService>;
