import { and, eq, inArray, ne, sql } from 'drizzle-orm';
import type { Payment } from '../payments.ts';
import type { Db } from './client.ts';
import { billQuotes, orderLines, orders, payments } from './schema.ts';
import { stampPaidOrder } from '../loyalty/paidOrder.ts';

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
    feePesewas: row.feePesewas,
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
      quoteId: string | null = null,
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
          feePesewas: payment.feePesewas,
          quoteId,
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

    async get(
      reference: string,
    ): Promise<{ payment: Payment; lastAskedAt: number | null; venueSlug: string } | null> {
      const [row] = await db.select().from(payments).where(eq(payments.reference, reference));
      return row
        ? { payment: toPayment(row), lastAskedAt: row.lastAskedAt?.getTime() ?? null, venueSlug: row.venueSlug }
        : null;
    },

    /**
     * Saves a change. The first time a payment becomes succeeded, its bill share is added to the
     * order in the same transaction, and the lines it paid for are marked paid. The update only
     * matches while the row isn't succeeded yet, so a webhook and a verify arriving together
     * can't count the money twice.
     */
    async save(payment: Payment): Promise<void> {
      if (payment.status !== 'succeeded') {
        // Never over a success: a slower answer read before the webhook must not undo it.
        await db
          .update(payments)
          .set(changes(payment))
          .where(and(eq(payments.reference, payment.reference), ne(payments.status, 'succeeded')));
        return;
      }
      await db.transaction(async (tx) => {
        const [row] = await tx
          .update(payments)
          .set(changes(payment))
          .where(and(eq(payments.reference, payment.reference), ne(payments.status, 'succeeded')))
          .returning();
        if (!row?.quoteId) return;
        const [quote] = await tx.select().from(billQuotes).where(eq(billQuotes.id, row.quoteId));
        if (!quote) return;
        // Only the food share pays the order: the tip and the passed-on fee never count (BUILD.md).
        const [order] = await tx
          .update(orders)
          .set({
            paidPesewas: sql`least(${orders.totalPesewas}, ${orders.paidPesewas} + ${quote.sharePesewas})`,
            paymentMethod: row.method === 'momo' ? 'online_momo' : 'online_card',
            updatedAt: new Date(),
          })
          .where(eq(orders.id, row.orderId))
          .returning();
        if (!order) return;
        if (quote.mode === 'items' && quote.lineIds.length > 0) {
          await tx
            .update(orderLines)
            .set({ paid: true })
            .where(and(eq(orderLines.orderId, order.id), inArray(orderLines.id, quote.lineIds)));
        }
        if (order.paidPesewas >= order.totalPesewas) {
          await tx.update(orderLines).set({ paid: true }).where(eq(orderLines.orderId, order.id));
          // A fully paid order stamps the guest's loyalty card, in the same transaction.
          await stampPaidOrder(tx, order.id, payment.paidAt ? Date.parse(payment.paidAt) : Date.now());
        }
      });
    },

    async asked(reference: string, when: number): Promise<void> {
      await db.update(payments).set({ lastAskedAt: new Date(when) }).where(eq(payments.reference, reference));
    },
  };
}

export type PaymentStore = ReturnType<typeof paymentStore>;
