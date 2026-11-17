import { Hono, type Context } from 'hono';
import { and, desc, eq, isNull, ne } from 'drizzle-orm';
import { z } from 'zod';
import { menuCategories, menuItems, promos } from '../db/schema.ts';
import { body, Problem } from '../http/problem.ts';
import { roleAt, ROLES, signedIn, type OwnerDeps } from '../owner/staff.ts';
import { promoState } from '../shared/promos.ts';
import type { Promo, PromoInput } from '../shared/types.ts';

type Row = typeof promos.$inferSelect;

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const fields = {
  name: z.string().trim().min(1).max(60),
  kind: z.enum(['percent_off', 'amount_off', 'free_item']),
  percent: z.number().int().min(1).max(100).nullish(),
  amountPesewas: z.number().int().min(1).nullish(),
  freeItemId: z.string().nullish(),
  appliesTo: z.enum(['order', 'category']).optional(),
  categoryId: z.string().nullish(),
  minSpendPesewas: z.number().int().min(0).nullish(),
  // Guests type codes in capitals; the server keeps them that way.
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{3,20}$/).nullish(),
  channel: z.enum(['all', 'table', 'online']),
  days: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  startTime: hhmm.nullish(),
  endTime: hhmm.nullish(),
  startsAt: z.iso.datetime({ offset: true }).nullish(),
  endsAt: z.iso.datetime({ offset: true }).nullish(),
  usageLimit: z.number().int().min(1).nullish(),
  enabled: z.boolean(),
};
const inputBody = z.object(fields);
const patchBody = z.object(fields).partial();

/** The contract's Promo: the saved rule, its counts, and its state worked out now. */
function promoOf(row: Row, now: number): Promo {
  const rule = { ...(row.rule as PromoInput), id: row.id, code: row.code, enabled: row.enabled, usageCount: row.usageCount };
  return {
    ...rule,
    state: promoState(rule, now),
    discountGivenPesewas: row.discountGivenPesewas,
    createdAt: row.createdAt.toISOString(),
  } as Promo;
}

/** Promos and coupons (api/openapi.yaml owner promos). Staff read; owners and managers change. */
export function ownerPromoRoutes(deps: OwnerDeps) {
  const app = new Hono();
  const { db } = deps;

  const at = async (c: Context, write: boolean) => {
    const venueId = c.req.param('venueId') ?? '';
    roleAt(await signedIn(c, deps), venueId, write ? ROLES.menu : ROLES.orders);
    return venueId;
  };

  /** The checks before a promo is kept (the same as the demo's): 422 names the field to fix. */
  const check = async (venueId: string, input: PromoInput, selfId?: string) => {
    const bad = (code: string) => {
      throw new Problem(422, code, 'Check this promo.');
    };
    if (input.kind === 'percent_off' && !input.percent) bad('promo_percent_missing');
    if (input.kind === 'amount_off' && !input.amountPesewas) bad('promo_amount_missing');
    if (input.kind === 'free_item') {
      const [item] = input.freeItemId
        ? await db.select({ id: menuItems.id }).from(menuItems).where(and(eq(menuItems.id, input.freeItemId), eq(menuItems.venueId, venueId), isNull(menuItems.deletedAt)))
        : [];
      if (!item) bad('promo_item_missing');
    }
    if (input.appliesTo === 'category') {
      const [section] = input.categoryId
        ? await db.select({ id: menuCategories.id }).from(menuCategories).where(and(eq(menuCategories.id, input.categoryId), eq(menuCategories.venueId, venueId)))
        : [];
      if (!section) bad('promo_section_missing');
    }
    if (input.startsAt && input.endsAt && Date.parse(input.endsAt) <= Date.parse(input.startsAt)) bad('promo_dates');
    if (Boolean(input.startTime) !== Boolean(input.endTime)) bad('promo_hours');
    if (input.code) {
      const [taken] = await db
        .select({ id: promos.id })
        .from(promos)
        .where(and(eq(promos.venueId, venueId), eq(promos.code, input.code), isNull(promos.deletedAt), selfId ? ne(promos.id, selfId) : undefined));
      if (taken) throw new Problem(409, 'promo_code_taken', 'Another promo already uses this code.');
    }
  };

  app.get('/owner/venues/:venueId/promos', async (c) => {
    const venueId = await at(c, false);
    const rows = await db.select().from(promos).where(and(eq(promos.venueId, venueId), isNull(promos.deletedAt))).orderBy(desc(promos.createdAt));
    return c.json({ items: rows.map((row) => promoOf(row, deps.now())) });
  });

  app.post('/owner/venues/:venueId/promos', async (c) => {
    const venueId = await at(c, true);
    const input = { ...(await body(c, inputBody)) } as PromoInput;
    input.appliesTo ??= 'order';
    input.days ??= [];
    await check(venueId, input);
    const { code, enabled, ...rule } = input;
    const [row] = await db
      .insert(promos)
      .values({ id: `prm_${crypto.randomUUID().replaceAll('-', '')}`, venueId, rule, code: code ?? null, enabled, createdAt: new Date(deps.now()) })
      .returning();
    return c.json(promoOf(row!, deps.now()), 201);
  });

  const find = async (venueId: string, promoId: string) => {
    const [row] = await db.select().from(promos).where(and(eq(promos.id, promoId), eq(promos.venueId, venueId), isNull(promos.deletedAt)));
    if (!row) throw new Problem(404, 'not_found', 'That promo was deleted.');
    return row;
  };

  app.patch('/owner/venues/:venueId/promos/:promoId', async (c) => {
    const venueId = await at(c, true);
    const row = await find(venueId, c.req.param('promoId'));
    const patch = await body(c, patchBody);
    const next = { ...(row.rule as PromoInput), code: row.code, enabled: row.enabled, ...patch } as PromoInput;
    await check(venueId, next, row.id);
    const { code, enabled, ...rule } = next;
    const [saved] = await db.update(promos).set({ rule, code: code ?? null, enabled }).where(eq(promos.id, row.id)).returning();
    return c.json(promoOf(saved!, deps.now()));
  });

  /** Kept as a deleted row: orders that used it keep their discount and its name. */
  app.delete('/owner/venues/:venueId/promos/:promoId', async (c) => {
    const venueId = await at(c, true);
    const row = await find(venueId, c.req.param('promoId'));
    await db.update(promos).set({ deletedAt: new Date(deps.now()) }).where(eq(promos.id, row.id));
    return c.body(null, 204);
  });

  return app;
}
