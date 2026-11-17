import { randomInt } from 'node:crypto';
import { Hono, type Context } from 'hono';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { idempotencyKeys } from '../db/schema.ts';
import { readLoyaltyToken } from '../guest/loyaltyToken.ts';
import { body, Problem } from '../http/problem.ts';
import { cardOf, loadLoyalty, memberCount, step } from '../loyalty/store.ts';
import { ghanaPhone } from '../shared/brand.ts';
import { toWire } from '../shared/loyaltyFacts.ts';
import type { LoyaltyProgram } from '../shared/types.ts';
import { venueRowBySlug } from '../venues/venueData.ts';
import type { GuestDeps } from './guest.ts';

export type LoyaltyDeps = GuestDeps & { loyaltyKey: Buffer };

// The shared rules draw ids and claim codes from this; crypto-strong so codes can't be guessed.
const random = () => randomInt(0, 2 ** 32) / 2 ** 32;

const joinBody = z.object({
  firstName: z.string().trim().min(1).max(40).optional(),
  birthdayMonthDay: z.string().regex(/^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/).optional(),
  consent: z.object({ loyalty: z.boolean(), marketing: z.boolean(), textVersion: z.string().min(1).max(60) }),
});

/** The phone a guest proved with an SMS code (POST /auth/otp/verify), or 401. */
export function loyaltyPhoneOf(c: Context, deps: LoyaltyDeps): string {
  const phone = readLoyaltyToken(deps.loyaltyKey, c.req.header('Authorization')?.replace(/^Bearer /, ''), deps.now());
  if (!phone) throw new Problem(401, 'unauthorized', 'Confirm your phone number again.');
  return phone;
}

/** A guest's loyalty card at a venue (api/openapi.yaml loyalty). Run by the shared ledger rules. */
export function loyaltyRoutes(deps: LoyaltyDeps) {
  const app = new Hono();
  const { db } = deps;

  app.get('/venues/:venueSlug/loyalty', async (c) => {
    const venue = await venueRowBySlug(db, c.req.param('venueSlug'));
    const record = await db.transaction((tx) => loadLoyalty(tx, venue.id, venue.currency, 'none'));
    const programme = toWire(record, { kind: 'programme' }) as LoyaltyProgram;
    return c.json({ ...programme, memberCount: await memberCount(db, venue.id) });
  });

  app.get('/venues/:venueSlug/loyalty/me', async (c) => {
    const phone = loyaltyPhoneOf(c, deps);
    const venue = await venueRowBySlug(db, c.req.param('venueSlug'));
    const card = await db.transaction(async (tx) => cardOf(tx, await loadLoyalty(tx, venue.id, venue.currency, { phone }), phone));
    if (!card) throw new Problem(404, 'not_a_member', 'Not a member yet.');
    return c.json(card);
  });

  /** Joining records consent with its text version (Act 843). Joining again updates it. */
  app.put('/venues/:venueSlug/loyalty/me', async (c) => {
    const phone = loyaltyPhoneOf(c, deps);
    const input = await body(c, joinBody);
    const venue = await venueRowBySlug(db, c.req.param('venueSlug'));
    const card = await db.transaction(async (tx) => {
      const before = await loadLoyalty(tx, venue.id, venue.currency, { phone });
      const { after } = await step(tx, before, { type: 'join', phone: ghanaPhone(phone), ...input, random }, deps.now());
      return cardOf(tx, after, phone);
    });
    return c.json(card);
  });

  /** Leaving withdraws consent and deletes their card and ledger at this venue. */
  app.delete('/venues/:venueSlug/loyalty/me', async (c) => {
    const phone = loyaltyPhoneOf(c, deps);
    const venue = await venueRowBySlug(db, c.req.param('venueSlug'));
    await db.transaction(async (tx) => {
      await step(tx, await loadLoyalty(tx, venue.id, venue.currency, { phone }), { type: 'leave', phone: ghanaPhone(phone) }, deps.now());
    });
    return c.body(null, 204);
  });

  /** Opens a short-lived claim code. Only a staff member confirming it takes stamps off. */
  app.post('/venues/:venueSlug/loyalty/me/redeem', async (c) => {
    const phone = loyaltyPhoneOf(c, deps);
    const input = await body(c, z.object({ rewardId: z.string().min(1), orderId: z.string().optional() }));
    const venue = await venueRowBySlug(db, c.req.param('venueSlug'));
    const key = c.req.header('Idempotency-Key');
    const card = await db.transaction(async (tx) => {
      const before = await loadLoyalty(tx, venue.id, venue.currency, { phone });
      const memberId = Object.keys(before.members)[0];
      if (!memberId) throw new Problem(404, 'not_a_member', 'Not a member yet.');
      const scope = `redeem:${memberId}`;
      // A retried tap gets the card with the code it already opened, not "a code is waiting".
      if (key) {
        const [seen] = await tx.select().from(idempotencyKeys).where(and(eq(idempotencyKeys.scope, scope), eq(idempotencyKeys.key, key)));
        if (seen) return cardOf(tx, before, phone);
      }
      const { after } = await step(tx, before, { type: 'open_claim', phone: ghanaPhone(phone), rewardId: input.rewardId, random }, deps.now());
      if (key) await tx.insert(idempotencyKeys).values({ scope, key, status: 200, body: {} });
      return cardOf(tx, after, phone);
    });
    return c.json(card);
  });

  return app;
}
