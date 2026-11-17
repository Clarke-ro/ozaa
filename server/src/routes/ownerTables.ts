import { Hono, type Context } from 'hono';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { diningTables } from '../db/schema.ts';
import { body, Problem } from '../http/problem.ts';
import { roleAt, ROLES, signedIn, type OwnerDeps } from '../owner/staff.ts';
import { qrSvg } from '../shared/qrSvg.ts';
import { tableLink } from '../shared/tableLink.ts';
import type { Table } from '../shared/types.ts';
import { venueRowById } from '../venues/venueData.ts';

// A table code goes into the QR address (/slug/t/CODE), so keep it to letters, digits and dashes.
const code = z.string().trim().regex(/^[A-Za-z0-9-]{1,12}$/, 'Use up to 12 letters, digits or dashes.');
const createBody = z.object({ codes: z.array(code).min(1).max(200) });

/** Tables and their QR stickers (api/openapi.yaml owner tables). */
export function ownerTablesRoutes(deps: OwnerDeps & { siteUrl: string }) {
  const app = new Hono();
  const { db } = deps;

  const venueFor = async (c: Context, allowed: typeof ROLES.orders) => {
    const venueId = c.req.param('venueId') ?? '';
    roleAt(await signedIn(c, deps), venueId, allowed);
    return venueRowById(db, venueId);
  };
  const tableOf = (slug: string, row: typeof diningTables.$inferSelect): Table => ({
    id: row.id,
    code: row.code,
    label: row.label ?? `Table ${row.code}`,
    // The QR holds the real app's table page: scanning it starts a table visit.
    qrUrl: tableLink(deps.siteUrl, slug, row.code),
  });

  // Every staff member sees the tables (the floor and the orders desk name them).
  app.get('/owner/venues/:venueId/tables', async (c) => {
    const venue = await venueFor(c, ROLES.orders);
    const rows = await db.select().from(diningTables).where(eq(diningTables.venueId, venue.id)).orderBy(asc(diningTables.createdAt));
    // "2" before "10": tables sort by their number when they have one.
    rows.sort((a, b) => a.code.localeCompare(b.code, 'en', { numeric: true }));
    return c.json({ items: rows.map((row) => tableOf(venue.slug, row)) });
  });

  /** Adds tables. A code that already exists is kept as it is, so "add 1 to 20" is safe to repeat. */
  app.post('/owner/venues/:venueId/tables', async (c) => {
    const venue = await venueFor(c, ROLES.menu);
    const codes = [...new Set((await body(c, createBody)).codes)];
    await db
      .insert(diningTables)
      .values(codes.map((tableCode) => ({ id: `tbl_${crypto.randomUUID().replaceAll('-', '')}`, venueId: venue.id, code: tableCode, label: `Table ${tableCode}` })))
      .onConflictDoNothing();
    const rows = await db.select().from(diningTables).where(and(eq(diningTables.venueId, venue.id), inArray(diningTables.code, codes)));
    return c.json({ items: codes.map((tableCode) => tableOf(venue.slug, rows.find((row) => row.code === tableCode)!)) }, 201);
  });

  /** The QR code as SVG, the same drawing the app shows. PNG and PDF come later. */
  app.get('/owner/venues/:venueId/tables/:tableId/qr', async (c) => {
    const venue = await venueFor(c, ROLES.menu);
    const format = c.req.query('format') ?? 'svg';
    if (format !== 'svg') throw new Problem(400, 'format_not_ready', 'Download the SVG for now; it prints sharp at any size.');
    const [row] = await db
      .select()
      .from(diningTables)
      .where(and(eq(diningTables.id, c.req.param('tableId')), eq(diningTables.venueId, venue.id)));
    if (!row) throw new Problem(404, 'not_found', 'That table is gone.');
    return c.body(qrSvg(tableLink(deps.siteUrl, venue.slug, row.code), 512), 200, { 'Content-Type': 'image/svg+xml' });
  });

  return app;
}
