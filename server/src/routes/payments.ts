import { Hono, type Context } from 'hono';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { Db } from '../db/client.ts';
import { billQuotes, payments as paymentRows, venues } from '../db/schema.ts';
import { Problem } from '../http/problem.ts';
import type { Log } from '../log.ts';
import { releaseExpiredHolds } from '../orders/orderInventory.ts';
import { orderById } from '../orders/orderStore.ts';
import type { PaymentService } from '../payments.ts';
import { isFromPaystack } from '../signature.ts';
import { canSeeOrder, guestOf, type GuestDeps } from './guest.ts';

const startBody = z.object({
  quoteId: z.string().min(1),
  method: z.enum(['momo', 'card']),
  momo: z.object({ phone: z.string().regex(/^\+233\d{9}$/), provider: z.enum(['mtn', 'vod', 'atl']) }).optional(),
  email: z.email().optional(),
});

const webhookBody = z.object({
  event: z.string(),
  data: z.object({
    reference: z.string(),
    status: z.string(),
    amount: z.number().int(),
    currency: z.string(),
    gateway_response: z.string().nullish().transform((v) => v ?? undefined),
  }),
});

export type PaymentRouteDeps = GuestDeps & { payments: PaymentService; log: Log };

/**
 * Payments (api/openapi.yaml payments). The amount always comes from a bill quote the server made
 * (POST /orders/{id}/bill), never from the app, and is charged with the venue's own Paystack key.
 */
export function paymentRoutes(deps: PaymentRouteDeps) {
  const app = new Hono();
  const { db } = deps;

  /** A payment this guest may see: one for an order they can see. */
  async function visiblePayment(c: Context) {
    const guest = guestOf(c, deps);
    const reference = c.req.param('reference') ?? '';
    const [row] = await db.select({ orderId: paymentRows.orderId }).from(paymentRows).where(eq(paymentRows.reference, reference));
    const order = row ? await orderById(db, row.orderId) : null;
    if (!order || !canSeeOrder(guest, order.row)) throw new Problem(404, 'payment_not_found', 'Payment not found.');
    return reference;
  }

  app.post('/payments', async (c) => {
    const guest = guestOf(c, deps);
    const key = c.req.header('Idempotency-Key');
    if (!key) throw new Problem(400, 'idempotency_key_missing', 'Missing Idempotency-Key.');
    const input = startBody.safeParse(await c.req.json().catch(() => null));
    // MoMo may come without a phone: then Paystack's page asks for it (Clarke, 2026-11-23).
    if (!input.success) {
      throw new Problem(422, 'validation', 'Check the payment details and try again.');
    }
    const [quote] = await db.select().from(billQuotes).where(eq(billQuotes.id, input.data.quoteId));
    const found = quote ? await orderById(db, quote.orderId) : null;
    if (!quote || !found || !canSeeOrder(guest, found.row)) {
      throw new Problem(409, 'quote_expired', 'Your bill changed. Check it and try again.');
    }
    // A retry with the same key gets its first payment back, even after the quote has expired.
    const [repeat] = await db.select({ reference: paymentRows.reference }).from(paymentRows).where(eq(paymentRows.idempotencyKey, key));
    if (!repeat) {
      // An unpaid order that sat too long has given its dish back. Don't charge it, and don't
      // start a payment that would keep the hold alive. Paystack is called later, in start().
      await releaseExpiredHolds(db, deps.now(), found.row.venueId);
      const fresh = await orderById(db, quote.orderId);
      if (!fresh || fresh.order.status === 'cancelled') {
        throw new Problem(409, 'quote_expired', 'This order was cancelled. Place it again.');
      }
      if (quote.expiresAt.getTime() < deps.now()) throw new Problem(409, 'quote_expired', 'Your bill changed. Check it and try again.');
      if (fresh.order.paymentStatus === 'paid') throw new Problem(409, 'nothing_to_pay', 'This bill is already paid.');
    }
    const [venue] = await db.select({ slug: venues.slug }).from(venues).where(eq(venues.id, found.row.venueId));
    if (!venue) throw new Problem(404, 'venue_not_found', 'We could not find that venue.');
    const payment = await deps.payments.start(
      {
        charge: {
          orderId: quote.orderId,
          venueSlug: venue.slug,
          quoteId: quote.id,
          amountPesewas: quote.totalPesewas,
          tipPesewas: quote.tipPesewas,
          feePesewas: quote.feePesewas,
        },
        method: input.data.method,
        momo: input.data.momo,
        email: input.data.email,
      },
      key,
    );
    // No phone numbers, emails or tokens in logs (AGENTS.md, Act 843).
    deps.log({ event: 'payment_started', reference: payment.reference, method: payment.method, status: payment.status });
    return c.json(payment, 201);
  });

  app.get('/payments/:reference', async (c) => {
    const payment = await deps.payments.get(await visiblePayment(c));
    if (!payment) throw new Problem(404, 'payment_not_found', 'Payment not found.');
    return c.json(payment);
  });

  app.post('/payments/:reference/verify', async (c) => {
    const payment = await deps.payments.verify(await visiblePayment(c));
    if (!payment) throw new Problem(404, 'payment_not_found', 'Payment not found.');
    deps.log({ event: 'payment_verified', reference: payment.reference, status: payment.status });
    return c.json(payment);
  });

  /**
   * Paystack calls this for each venue's account. Every venue has its own secret key, so we find
   * the payment by its reference first, then check the signature with that venue's key. A
   * reference we never made (the venue's other sales) gets 200 and is ignored, so Paystack
   * doesn't keep retrying it; a known one with a bad signature is refused.
   */
  app.post('/webhooks/paystack', async (c) => {
    const raw = await c.req.text();
    let json: unknown = null;
    try {
      json = JSON.parse(raw);
    } catch {
      // Not JSON: nothing to act on.
    }
    const parsed = webhookBody.safeParse(json);
    if (!parsed.success) return c.body(null, 200);
    const reference = parsed.data.data.reference;
    const secret = await deps.payments.webhookSecret(reference);
    if (!secret) {
      deps.log({ event: 'webhook_ignored', reason: 'unknown_reference' });
      return c.body(null, 200);
    }
    if (!isFromPaystack(raw, c.req.header('x-paystack-signature'), secret)) {
      deps.log({ event: 'webhook_refused', reference });
      return c.body(null, 401);
    }
    const payment = await deps.payments.fromWebhook(reference, parsed.data.data);
    deps.log({ event: 'webhook', type: parsed.data.event, reference, status: payment?.status ?? 'unknown_reference' });
    return c.body(null, 200);
  });

  return app;
}
