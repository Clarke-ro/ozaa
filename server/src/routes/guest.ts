import { Hono, type Context } from 'hono';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { Db } from '../db/client.ts';
import { promos } from '../db/schema.ts';
import { GUEST_TTL_MS, readGuestToken, signGuestToken, type GuestClaims } from '../guest/token.ts';
import { body, Problem } from '../http/problem.ts';
import { makeQuote } from '../orders/billQuote.ts';
import { orderById, saveOrder } from '../orders/orderStore.ts';
import { priceOrder } from '../orders/priceOrder.ts';
import { pesewas } from '../shared/brand.ts';
import type { PromoRule } from '../shared/promos.ts';
import type { TaxSetup } from '../shared/types.ts';
import {
  menuOf,
  offersOf,
  paymentSettingsOf,
  publicVenue,
  tableOf,
  venueRowById,
  venueRowBySlug,
  wifiOf,
} from '../venues/venueData.ts';

export type GuestDeps = { db: Db; guestSecret: string; now: () => number };

const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);
const sessionBody = z.object({ venueSlug: slug, tableCode: z.string().min(1).max(12).optional(), language: z.string().optional() });
const phone = z.string().regex(/^\+233\d{9}$/);
const orderBody = z.object({
  clientOrderId: z.string().uuid(),
  lines: z
    .array(
      z.object({
        menuItemId: z.string().min(1),
        quantity: z.number().int().min(1).max(50),
        modifierOptionIds: z.array(z.string()).optional(),
        note: z.string().max(140).optional(),
      }),
    )
    .min(1)
    .max(60),
  note: z.string().max(200).optional(),
  promoCode: z.string().regex(/^[A-Z0-9]{3,20}$/).optional(),
  fulfilment: z
    .object({
      type: z.enum(['pickup', 'delivery']),
      contact: z.object({ name: z.string().min(1).max(60), phone }),
      address: z.string().max(200).optional(),
      location: z.object({ lat: z.number(), lng: z.number() }).optional(),
    })
    .optional(),
});
const quoteBody = z.object({
  mode: z.enum(['whole', 'equal', 'items']),
  parts: z.number().int().min(2).max(20).optional(),
  lineIds: z.array(z.string()).optional(),
  tip: z
    .object({ percent: z.union([z.literal(0), z.literal(5), z.literal(10), z.literal(15)]).optional(), customPesewas: z.number().int().min(0).optional() })
    .optional(),
});

/** The guest token from `Authorization: Bearer …`, or 401: guests start one by scanning. */
export function guestOf(c: Context, deps: GuestDeps): GuestClaims {
  const header = c.req.header('Authorization');
  const claims = readGuestToken(deps.guestSecret, header?.replace(/^Bearer /, ''), deps.now());
  if (!claims) throw new Problem(401, 'unauthorized', 'Start again from the venue’s QR code or link.');
  return claims;
}

/** Guest calls (api/openapi.yaml: guest-session, venues, menu, orders). No personal data in logs. */
export function guestRoutes(deps: GuestDeps) {
  const app = new Hono();
  const { db } = deps;

  app.post('/guest-sessions', async (c) => {
    const input = await body(c, sessionBody);
    const row = await venueRowBySlug(db, input.venueSlug);
    let table = null;
    if (input.tableCode) {
      table = await tableOf(db, row.id, input.tableCode);
      if (!table) throw new Problem(404, 'venue_not_found', 'That table code is not at this venue.');
    }
    const exp = deps.now() + GUEST_TTL_MS;
    const guestToken = signGuestToken(deps.guestSecret, { venueId: row.id, tableCode: table?.code ?? null, exp });
    return c.json(
      {
        guestToken,
        expiresAt: new Date(exp).toISOString(),
        venue: await publicVenue(db, row, deps.now()),
        ...(table ? { table } : {}),
      },
      201,
    );
  });

  app.get('/venues/:slug', async (c) => {
    const row = await venueRowBySlug(db, c.req.param('slug'));
    return c.json(await publicVenue(db, row, deps.now()));
  });

  app.get('/venues/:slug/menu', async (c) => {
    const row = await venueRowBySlug(db, c.req.param('slug'));
    return c.json(await menuOf(db, row.id));
  });

  app.get('/venues/:slug/wifi', async (c) => {
    const row = await venueRowBySlug(db, c.req.param('slug'));
    // The password isn't public on the web: only guests in a session at this venue get it.
    if (guestOf(c, deps).venueId !== row.id) throw new Problem(404, 'not_found', 'No Wi-Fi details here.');
    const wifi = wifiOf(row);
    if (!wifi) throw new Problem(404, 'not_found', 'This venue has no Wi-Fi to share.');
    return c.json(wifi);
  });

  app.get('/venues/:slug/offers', async (c) => {
    const row = await venueRowBySlug(db, c.req.param('slug'));
    return c.json({ items: offersOf(row) });
  });

  app.post('/orders', async (c) => {
    const guest = guestOf(c, deps);
    const input = await body(c, orderBody);
    const row = await venueRowById(db, guest.venueId);
    const venue = await publicVenue(db, row, deps.now());
    if (venue.published === false) throw new Problem(409, 'venue_not_published', "This menu isn't open yet.");
    const menu = await menuOf(db, row.id);
    const rules = await db.select().from(promos).where(eq(promos.venueId, row.id));
    const priced = priceOrder({
      items: menu.items,
      venue,
      promos: rules
        .filter((rule) => !rule.deletedAt)
        .map((rule) => ({ ...(rule.rule as PromoRule), id: rule.id, usageCount: rule.usageCount, enabled: rule.enabled, code: rule.code })),
      tax: (row.tax as TaxSetup | null) ?? null,
      body: input,
      tableCode: guest.tableCode,
      now: deps.now(),
    });
    const order = await saveOrder(db, {
      venueId: row.id,
      guestSessionId: guest.sid,
      clientOrderId: input.clientOrderId,
      tableCode: guest.tableCode,
      priced,
      now: deps.now(),
    });
    return c.json(order, 201);
  });

  /** An order this guest may see: their own, or their table's while it is still open. */
  async function visibleOrder(c: Context) {
    const guest = guestOf(c, deps);
    const found = await orderById(db, c.req.param('orderId') ?? '');
    const row = found?.row;
    const mine =
      row &&
      row.venueId === guest.venueId &&
      (row.guestSessionId === guest.sid ||
        (guest.tableCode !== null && row.tableCode === guest.tableCode && row.status !== 'served' && row.status !== 'cancelled'));
    if (!found || !mine) throw new Problem(404, 'order_not_found', 'We could not find that order.');
    return found;
  }

  app.get('/orders/:orderId', async (c) => c.json((await visibleOrder(c)).order));

  app.post('/orders/:orderId/bill', async (c) => {
    const { order } = await visibleOrder(c);
    const input = await body(c, quoteBody);
    // A custom tip arrives as a plain number; the shared rules want it marked as whole pesewas.
    const request = {
      ...input,
      tip: input.tip
        ? {
            ...(input.tip.percent !== undefined ? { percent: input.tip.percent } : {}),
            ...(input.tip.customPesewas !== undefined ? { customPesewas: pesewas(input.tip.customPesewas) } : {}),
          }
        : undefined,
    };
    const pay = await paymentSettingsOf(db, order.venueId);
    if (!pay.paystack) throw new Problem(409, 'online_pay_off', 'Pay at the counter, or ask your waiter for the bill.');
    return c.json(await makeQuote(db, { order, request, feePassing: pay.feePassing, now: deps.now() }));
  });

  return app;
}
