import { Hono, type Context } from 'hono';
import { and, asc, count, eq } from 'drizzle-orm';
import { z } from 'zod';
import { customLinks } from '../db/schema.ts';
import { body, Problem } from '../http/problem.ts';
import { roleAt, ROLES, signedIn, type OwnerDeps } from '../owner/staff.ts';
import type { CustomLink } from '../shared/types.ts';

type Row = typeof customLinks.$inferSelect;

// Only web, email and phone links: a "javascript:" or "data:" link on a guest's screen could run code.
const safeUrl = z
  .string()
  .trim()
  .max(500)
  .refine((url) => /^(https?:\/\/[^\s]+|mailto:[^\s]+|tel:\+?[0-9 ]+)$/i.test(url), 'Use a web, email or phone link.');
const fields = {
  title: z.string().trim().min(1).max(40),
  url: safeUrl,
  icon: z.string().max(30).optional(),
  placement: z.enum(['button', 'banner', 'menu']).optional(),
  startDate: z.iso.datetime({ offset: true }).nullish(),
  endDate: z.iso.datetime({ offset: true }).nullish(),
  sortOrder: z.number().int().min(0).max(1000).optional(),
  enabled: z.boolean().optional(),
};

const linkOf = (row: Row): CustomLink => ({
  id: row.id,
  venueId: row.venueId,
  title: row.title,
  url: row.url,
  icon: row.icon ?? 'globe',
  placement: row.placement,
  startDate: row.startDate?.toISOString() ?? null,
  endDate: row.endDate?.toISOString() ?? null,
  sortOrder: row.sortOrder,
  clicks: row.clicks,
  enabled: row.enabled,
});

const when = (iso: string | null | undefined) => (iso === undefined ? undefined : iso === null ? null : new Date(iso));

/** The owner's own link buttons (api/openapi.yaml owner links). Owners and managers. */
export function ownerLinkRoutes(deps: OwnerDeps) {
  const app = new Hono();
  const { db } = deps;
  const at = async (c: Context) => {
    const venueId = c.req.param('venueId') ?? '';
    roleAt(await signedIn(c, deps), venueId, ROLES.menu);
    return venueId;
  };
  const checkDates = (start: Date | null | undefined, end: Date | null | undefined) => {
    if (start && end && end <= start) throw new Problem(422, 'link_dates', 'The end date must be after the start.');
  };

  app.get('/owner/venues/:venueId/links', async (c) => {
    const venueId = await at(c);
    const rows = await db.select().from(customLinks).where(eq(customLinks.venueId, venueId)).orderBy(asc(customLinks.sortOrder));
    return c.json({ items: rows.map(linkOf) });
  });

  app.post('/owner/venues/:venueId/links', async (c) => {
    const venueId = await at(c);
    const input = await body(c, z.object(fields));
    checkDates(when(input.startDate), when(input.endDate));
    const [{ n } = { n: 0 }] = await db.select({ n: count() }).from(customLinks).where(eq(customLinks.venueId, venueId));
    const [row] = await db
      .insert(customLinks)
      .values({
        id: `lnk_${crypto.randomUUID().replaceAll('-', '')}`,
        venueId,
        title: input.title,
        url: input.url,
        icon: input.icon ?? 'globe',
        placement: input.placement ?? 'button',
        startDate: when(input.startDate) ?? null,
        endDate: when(input.endDate) ?? null,
        // A new link goes last.
        sortOrder: input.sortOrder ?? n + 1,
        enabled: input.enabled ?? true,
      })
      .returning();
    return c.json(linkOf(row!), 201);
  });

  app.patch('/owner/venues/:venueId/links/:linkId', async (c) => {
    const venueId = await at(c);
    const input = await body(c, z.object(fields).partial());
    const [current] = await db.select().from(customLinks).where(and(eq(customLinks.id, c.req.param('linkId')), eq(customLinks.venueId, venueId)));
    if (!current) throw new Problem(404, 'not_found', 'That link is gone.');
    const startDate = when(input.startDate);
    const endDate = when(input.endDate);
    checkDates(startDate === undefined ? current.startDate : startDate, endDate === undefined ? current.endDate : endDate);
    const [row] = await db
      .update(customLinks)
      .set({
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.url !== undefined ? { url: input.url } : {}),
        ...(input.icon !== undefined ? { icon: input.icon } : {}),
        ...(input.placement !== undefined ? { placement: input.placement } : {}),
        ...(startDate !== undefined ? { startDate } : {}),
        ...(endDate !== undefined ? { endDate } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
        ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
      })
      .where(eq(customLinks.id, current.id))
      .returning();
    return c.json(linkOf(row!));
  });

  app.delete('/owner/venues/:venueId/links/:linkId', async (c) => {
    const venueId = await at(c);
    await db.delete(customLinks).where(and(eq(customLinks.id, c.req.param('linkId')), eq(customLinks.venueId, venueId)));
    return c.body(null, 204);
  });

  return app;
}
