import { randomInt } from 'node:crypto';
import { Hono, type Context } from 'hono';
import { and, eq, inArray, isNotNull } from 'drizzle-orm';
import { z } from 'zod';
import { idempotencyKeys, loyaltyFacts, loyaltyPrograms, orderLines, orders } from '../db/schema.ts';
import { body, Problem } from '../http/problem.ts';
import { counterReward, counterStamp } from '../loyalty/counter.ts';
import { analyticsOf, customerDetail, customersOf, scanLogOf } from '../loyalty/desk.ts';
import { loadLoyalty, memberCount, step } from '../loyalty/store.ts';
import { orderFromRows } from '../orders/orderStore.ts';
import { roleAt, ROLES, signedIn, type OwnerDeps } from '../owner/staff.ts';
import type { VenueLoyalty } from '../shared/factsTypes.ts';
import { toWire } from '../shared/loyaltyFacts.ts';
import type { LoyaltyCard, LoyaltyProgram, StaffRole } from '../shared/types.ts';
import { venueRowById } from '../venues/venueData.ts';

type Tx = Parameters<Parameters<OwnerDeps['db']['transaction']>[0]>[0];

const random = () => randomInt(0, 2 ** 32) / 2 ** 32;
// Settings the shared rules don't use but the owner app shows (look of the card, automations,
// cooldown, wording). Kept beside the rules and sent back, so the owner's choices stick.
const RULE_KEYS = new Set(['enabled', 'currency', 'earn', 'tiers', 'rewards', 'expiryDays', 'claimTtlSeconds', 'birthdayTreat', 'memberCount']);

/** The owner's loyalty desk (api/openapi.yaml owner loyalty). Same rules as the guest card. */
export function ownerLoyaltyRoutes(deps: OwnerDeps) {
  const app = new Hono();
  const { db } = deps;

  const at = async (c: Context, allowed: StaffRole[]) => {
    const who = await signedIn(c, deps);
    const venueId = c.req.param('venueId') ?? '';
    roleAt(who, venueId, allowed);
    const venue = await venueRowById(db, venueId);
    const membership = who.memberships.find((m) => m.venueId === venueId);
    return { venue, staffName: who.user.firstName, membership };
  };

  /** The programme as the owner app edits it: the rules, the extra settings, the member count. */
  const programmeOf = async (tx: Tx, record: VenueLoyalty) => {
    const [row] = await tx.select().from(loyaltyPrograms).where(eq(loyaltyPrograms.venueId, record.venueId));
    const raw = (row?.programme ?? {}) as Record<string, unknown>;
    const extras = Object.fromEntries(Object.entries(raw).filter(([key]) => !RULE_KEYS.has(key)));
    return {
      stampOnPaidOrder: true,
      ...extras,
      ...(toWire(record, { kind: 'programme' }) as LoyaltyProgram),
      memberCount: await memberCount(tx, record.venueId),
    } as LoyaltyProgram;
  };

  app.get('/owner/venues/:venueId/loyalty', async (c) => {
    const { venue } = await at(c, ROLES.orders);
    return c.json(await db.transaction(async (tx) => programmeOf(tx, await loadLoyalty(tx, venue.id, venue.currency, 'none'))));
  });

  app.put('/owner/venues/:venueId/loyalty', async (c) => {
    const { venue } = await at(c, ROLES.menu);
    const input = await c.req.json().catch(() => null);
    if (!input || typeof input !== 'object') throw new Problem(400, 'programme_invalid', 'That programme is not valid.');
    const programme = await db.transaction(async (tx) => {
      // Every member's ledger is needed: the earn mode can't change once anyone has earned.
      const before = await loadLoyalty(tx, venue.id, venue.currency, 'all');
      const { after } = await step(tx, before, { type: 'save_programme', input, venueCurrency: venue.currency, random }, deps.now());
      const extras = Object.fromEntries(Object.entries(input as Record<string, unknown>).filter(([key]) => !RULE_KEYS.has(key)));
      const saved = { ...extras, ...after.programme, memberCount: 0 };
      await tx
        .insert(loyaltyPrograms)
        .values({ venueId: venue.id, programme: saved, updatedAt: new Date(deps.now()) })
        .onConflictDoUpdate({ target: loyaltyPrograms.venueId, set: { programme: saved, updatedAt: new Date(deps.now()) } });
      return programmeOf(tx, after);
    });
    return c.json(programme);
  });

  app.get('/owner/venues/:venueId/loyalty/members', async (c) => {
    const { venue } = await at(c, ROLES.menu);
    const items = await db.transaction(async (tx) => {
      const record = await loadLoyalty(tx, venue.id, venue.currency, 'all');
      const count = Object.keys(record.members).length;
      return (toWire(record, { kind: 'roster' }) as LoyaltyCard[]).map((card) => ({ ...card, programme: { ...card.programme, memberCount: count } }));
    });
    return c.json({ items, nextCursor: null });
  });

  /** A guest shows their 6-letter code; staff confirming it is the only thing that takes stamps off. */
  app.post('/owner/venues/:venueId/loyalty/confirm', async (c) => {
    const { venue, staffName } = await at(c, ROLES.loyaltyDesk);
    const input = await body(c, z.object({ code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{6}$/) }));
    const key = c.req.header('Idempotency-Key');
    const card = await db.transaction(async (tx) => {
      const before = await loadLoyalty(tx, venue.id, venue.currency, 'all');
      const scope = `confirm:${venue.id}`;
      if (key) {
        const [seen] = await tx.select().from(idempotencyKeys).where(and(eq(idempotencyKeys.scope, scope), eq(idempotencyKeys.key, key)));
        if (seen) return toWire(before, { kind: 'member', memberId: (seen.body as { memberId: string }).memberId });
      }
      const { after, memberId } = await step(tx, before, { type: 'confirm', code: input.code }, deps.now(), staffName);
      if (!memberId) throw new Problem(404, 'claim_unknown', 'That code is not active.');
      if (key) await tx.insert(idempotencyKeys).values({ scope, key, status: 200, body: { memberId } });
      return toWire(after, { kind: 'member', memberId });
    });
    return c.json(card);
  });

  app.get('/owner/venues/:venueId/loyalty/analytics', async (c) => {
    const { venue } = await at(c, ROLES.menu);
    const range = z.enum(['7d', '30d', '90d']).catch('30d').parse(c.req.query('range'));
    const record = await db.transaction((tx) => loadLoyalty(tx, venue.id, venue.currency, 'all'));
    return c.json(analyticsOf(record, range, deps.now()));
  });

  app.get('/owner/venues/:venueId/loyalty/customers', async (c) => {
    const { venue } = await at(c, ROLES.loyaltyDesk);
    const record = await db.transaction((tx) => loadLoyalty(tx, venue.id, venue.currency, 'all'));
    const all = customersOf(record, deps.now());
    let items = all;
    const wantsOffers = c.req.query('wantsOffers');
    if (wantsOffers === 'true' || wantsOffers === 'false') items = items.filter((x) => x.wantsOffers === (wantsOffers === 'true'));
    const search = c.req.query('search')?.trim().toLowerCase();
    // A name, or the last digits of the phone: the full number never leaves the server.
    if (search) items = items.filter((x) => x.name.toLowerCase().includes(search) || (/^\d{1,4}$/.test(search) && x.phoneMasked.endsWith(search)));
    const countsByTag: Record<string, number> = {};
    for (const x of items) for (const tag of x.tags ?? []) countsByTag[tag] = (countsByTag[tag] ?? 0) + 1;
    const tag = c.req.query('tag');
    if (tag) items = items.filter((x) => x.tags?.includes(tag as never));
    return c.json({ items, totalCount: all.length, countsByTag });
  });

  app.get('/owner/venues/:venueId/loyalty/customers/:customerId', async (c) => {
    const { venue } = await at(c, ROLES.loyaltyDesk);
    const record = await db.transaction((tx) => loadLoyalty(tx, venue.id, venue.currency, { memberId: c.req.param('customerId') }));
    const member = record.members[c.req.param('customerId')];
    if (!member) throw new Problem(404, 'not_found', 'That guest left the loyalty card.');
    const ids = member.facts.flatMap((f) => (f.kind === 'earn' && f.source.type === 'paid_visit' ? [f.source.orderId] : []));
    const rows = ids.length ? await db.select().from(orders).where(inArray(orders.id, ids)) : [];
    const lines = rows.length ? await db.select().from(orderLines).where(inArray(orderLines.orderId, rows.map((r) => r.id))) : [];
    const byId = new Map(rows.map((r) => [r.id, orderFromRows(r, lines.filter((l) => l.orderId === r.id))]));
    return c.json(customerDetail(record, member, byId, deps.now()));
  });

  /** Erasure on request (Act 843): the same as the guest leaving. Owner only. */
  app.delete('/owner/venues/:venueId/loyalty/customers/:customerId', async (c) => {
    const { venue } = await at(c, ROLES.payments);
    await db.transaction(async (tx) => {
      const before = await loadLoyalty(tx, venue.id, venue.currency, { memberId: c.req.param('customerId') });
      const member = before.members[c.req.param('customerId')];
      if (!member) throw new Problem(404, 'not_found', 'That guest left the loyalty card.');
      await step(tx, before, { type: 'leave', phone: member.phone }, deps.now());
    });
    return c.body(null, 204);
  });

  app.post('/owner/venues/:venueId/loyalty/scan', async (c) => {
    const { venue, staffName } = await at(c, ROLES.loyaltyDesk);
    const input = await body(c, z.object({ qrPayload: z.string().min(1).max(200), action: z.enum(['stamp', 'redeem']) }));
    const result = await db.transaction((tx) =>
      input.action === 'stamp' ? counterStamp(tx, venue.id, venue.currency, input.qrPayload, staffName, deps.now()) : counterReward(tx, venue.id, venue.currency, input.qrPayload, staffName, deps.now()),
    );
    return c.json(result);
  });

  app.post('/owner/venues/:venueId/loyalty/customers/:customerId/stamp', async (c) => {
    const { venue, staffName } = await at(c, ROLES.loyaltyDesk);
    return c.json(await db.transaction((tx) => counterStamp(tx, venue.id, venue.currency, c.req.param('customerId'), staffName, deps.now())));
  });

  app.get('/owner/venues/:venueId/loyalty/scans', async (c) => {
    const { venue } = await at(c, ROLES.loyaltyDesk);
    const since = c.req.query('since') ? Date.parse(c.req.query('since')!) : 0;
    const record = await db.transaction((tx) => loadLoyalty(tx, venue.id, venue.currency, 'all'));
    const given = await db.select({ id: loyaltyFacts.id, by: loyaltyFacts.by }).from(loyaltyFacts).where(and(eq(loyaltyFacts.venueId, venue.id), isNotNull(loyaltyFacts.by)));
    return c.json({ items: scanLogOf(record, new Map(given.map((g) => [g.id, g.by])), Number.isNaN(since) ? 0 : since) });
  });

  return app;
}
