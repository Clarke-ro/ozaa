import { eq } from 'drizzle-orm';
import type { Payment } from '../payments.ts';
import type { Db } from './client.ts';
import { payments } from './schema.ts';

type Row = typeof payments.$inferSelect;

const iso = (date: Date | null) => (date ? date.toISOString() : null);
const at = (text: string | null | undefined) => (text ? new Date(text) : null);

/** A database row as the contract's Payment. Missing optional fields stay missing, not null. */
function toPayment(row: Row): Payment {
  return {
    id: row.reference,
    reference: row.reference,
    orderId: row.orderId,
    method: row.method,
    ...(row.provider ? { provider: row.provider } : {}),
    amountPesewas: row.amountPesewas,
    tipPesewas: row.tipPesewas,
    currency: row.currency,
    status: row.status,
    ...(row.displayText ? { displayText: row.displayText } : {}),
    ...(row.authorizationUrl ? { authorizationUrl: row.authorizationUrl } : {}),
    approveBy: iso(row.approveBy),
    ...(row.failureReason ? { failureReason: row.failureReason } : {}),
    createdAt: row.createdAt.toISOString(),
    paidAt: iso(row.paidAt),
    testMode: row.testMode,
  };
}

/** The parts of a payment that change after it starts. */
function changes(payment: Payment) {
  return {
    status: payment.status,
    displayText: payment.displayText ?? null,
    authorizationUrl: payment.authorizationUrl ?? null,
    failureReason: payment.failureReason ?? null,
    paidAt: at(payment.paidAt),
  };
}

/** Payments in Postgres. The payment service holds the rules; this only reads and writes rows. */
export function paymentStore(db: Db) {
  return {
    /**
     * Saves a new payment under the app's Idempotency-Key, unless that key already has one. The
     * unique key makes Postgres the judge, so two taps at once still make a single payment.
     */
    async claim(
      key: string,
      payment: Payment,
      venueSlug: string,
    ): Promise<{ created: boolean; payment: Payment }> {
      const inserted = await db
        .insert(payments)
        .values({
          reference: payment.reference,
          idempotencyKey: key,
          orderId: payment.orderId,
          venueSlug,
          method: payment.method,
          provider: payment.provider ?? null,
          amountPesewas: payment.amountPesewas,
          tipPesewas: payment.tipPesewas,
          currency: payment.currency,
          approveBy: at(payment.approveBy),
          testMode: payment.testMode,
          createdAt: new Date(payment.createdAt),
          ...changes(payment),
        })
        .onConflictDoNothing({ target: payments.idempotencyKey })
        .returning();
      const row = inserted[0];
      if (row) return { created: true, payment: toPayment(row) };
      const [existing] = await db.select().from(payments).where(eq(payments.idempotencyKey, key));
      if (!existing) throw new Error('A claimed payment key had no payment.');
      return { created: false, payment: toPayment(existing) };
    },

    async get(reference: string): Promise<{ payment: Payment; lastAskedAt: number | null } | null> {
      const [row] = await db.select().from(payments).where(eq(payments.reference, reference));
      return row ? { payment: toPayment(row), lastAskedAt: row.lastAskedAt?.getTime() ?? null } : null;
    },

    async save(payment: Payment): Promise<void> {
      await db.update(payments).set(changes(payment)).where(eq(payments.reference, payment.reference));
    },

    async asked(reference: string, when: number): Promise<void> {
      await db.update(payments).set({ lastAskedAt: new Date(when) }).where(eq(payments.reference, reference));
    },
  };
}

export type PaymentStore = ReturnType<typeof paymentStore>;
