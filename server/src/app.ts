import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';
import { z } from 'zod';
import type { PaymentService } from './payments.ts';
import { isFromPaystack } from './signature.ts';
import type { Log } from './log.ts';

/**
 * Phase 2b only. The bill and its quote still live in the app's mock, so this server has never
 * seen the quote behind `quoteId`. The app sends what the quote says in this header, base64 JSON
 * { orderId, venueSlug, amountPesewas, tipPesewas }. Trusting the app for an amount is only
 * acceptable because this server refuses anything but a Paystack test key (config.ts). Phase 5
 * removes the header: the server works out the bill itself.
 */
export const SANDBOX_QUOTE = 'X-Cravins-Sandbox-Quote';

const quoteHeader = z.object({
  orderId: z.string().min(1),
  venueSlug: z.string().regex(/^[a-z0-9-]+$/),
  amountPesewas: z.number().int().positive(),
  tipPesewas: z.number().int().min(0),
});

const startBody = z.object({
  quoteId: z.string().min(1),
  method: z.enum(['momo', 'card']),
  momo: z
    .object({ phone: z.string().regex(/^\+233\d{9}$/), provider: z.enum(['mtn', 'vod', 'atl']) })
    .optional(),
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


/** Errors in the contract's Problem shape, with plain words in `detail`. */
function problem(c: Context, status: 400 | 401 | 404 | 422, code: string, detail: string) {
  return c.json(
    { type: `https://cravins.app/problems/${code}`, title: detail, status, detail, code },
    status,
    { 'Content-Type': 'application/problem+json' },
  );
}

function readQuote(header: string | undefined) {
  if (!header) return null;
  try {
    return quoteHeader.parse(JSON.parse(Buffer.from(header, 'base64').toString('utf8')));
  } catch {
    return null;
  }
}

export function createApp(deps: {
  payments: PaymentService;
  secret: string;
  allowedOrigins: string[];
  log: Log;
}) {
  const app = new Hono().basePath('/v1');
  app.use(
    '*',
    cors({
      origin: deps.allowedOrigins,
      allowMethods: ['GET', 'POST'],
      allowHeaders: ['Authorization', 'Content-Type', 'Idempotency-Key', SANDBOX_QUOTE],
    }),
  );

  app.post('/payments', async (c) => {
    const key = c.req.header('Idempotency-Key');
    if (!key) return problem(c, 400, 'idempotency_key_missing', 'Missing Idempotency-Key.');
    const body = startBody.safeParse(await c.req.json().catch(() => null));
    if (!body.success || (body.data.method === 'momo' && !body.data.momo))
      return problem(c, 422, 'validation', 'Check the payment details and try again.');
    const quote = readQuote(c.req.header(SANDBOX_QUOTE));
    if (!quote) return problem(c, 400, 'sandbox_quote_missing', 'This sandbox needs the bill quote.');
    const payment = await deps.payments.start(
      { charge: quote, method: body.data.method, momo: body.data.momo, email: body.data.email },
      key,
    );
    // No phone numbers, emails or tokens in logs (AGENTS.md, Act 843).
    deps.log({ event: 'payment_started', reference: payment.reference, method: payment.method, status: payment.status });
    return c.json(payment, 201);
  });

  app.get('/payments/:reference', async (c) => {
    const payment = await deps.payments.get(c.req.param('reference'));
    return payment ? c.json(payment) : problem(c, 404, 'payment_not_found', 'Payment not found.');
  });

  app.post('/payments/:reference/verify', async (c) => {
    const payment = await deps.payments.verify(c.req.param('reference'));
    if (payment) deps.log({ event: 'payment_verified', reference: payment.reference, status: payment.status });
    return payment ? c.json(payment) : problem(c, 404, 'payment_not_found', 'Payment not found.');
  });

  // Paystack calls this. Only a body signed with our secret key is believed.
  app.post('/webhooks/paystack', async (c) => {
    const raw = await c.req.text();
    if (!isFromPaystack(raw, c.req.header('x-paystack-signature'), deps.secret)) {
      deps.log({ event: 'webhook_refused' });
      return c.body(null, 401);
    }
    let json: unknown = null;
    try {
      json = JSON.parse(raw);
    } catch {
      // Signed but not JSON: nothing to act on.
    }
    const parsed = webhookBody.safeParse(json);
    if (parsed.success) {
      const payment = await deps.payments.fromWebhook(parsed.data.data.reference, parsed.data.data);
      deps.log({
        event: 'webhook',
        type: parsed.data.event,
        reference: parsed.data.data.reference,
        status: payment?.status ?? 'unknown_reference',
      });
    }
    // 200 for every signed call, so Paystack doesn't keep retrying events we don't use.
    return c.body(null, 200);
  });

  return app;
}
