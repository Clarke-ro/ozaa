import { Hono, type Context } from 'hono';
import { and, count, eq, inArray, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { businesses, diningTables, paymentSettings, scannerDevices, staffMemberships, venues } from '../db/schema.ts';
import { body, Problem } from '../http/problem.ts';
import { roleAt, ROLES, signedIn, type OwnerDeps, type SignedIn } from '../owner/staff.ts';
import type { Image } from '../shared/types.ts';
import { NO_MANUAL, type VenueProfile } from '../venues/venueData.ts';

type VenueRow = typeof venues.$inferSelect;
type Address = { email?: string | null; phone?: string | null; address1?: string | null; address2?: string | null; city?: string | null; postcode?: string | null; country?: string; digitalAddress?: string | null; geo?: { lat: number; lng: number } | null };

const nullableText = (max: number) => z.string().trim().max(max).nullish();
const businessPatch = z
  .object({
    name: z.string().trim().min(2).max(60),
    description: nullableText(300),
    categories: z.array(z.string().max(40)).max(8),
    cuisines: z.array(z.string().trim().min(1).max(30)).max(10),
    priceRange: z.number().int().min(1).max(4).nullish(),
    yearOpened: z.number().int().min(1900).max(2100).nullish(),
    website: nullableText(200),
    phone: nullableText(20),
    email: z.email().nullish(),
    tin: z.string().regex(/^[A-Z][0-9]{10}$/).nullish(),
    registrationNumber: nullableText(20),
  })
  .partial();
const locationInput = z.object({
  name: z.string().trim().min(2).max(60),
  country: z.string().trim().min(2).max(60),
  address1: z.string().trim().max(120).optional(),
  city: z.string().trim().max(60).optional(),
  postcode: z.string().trim().max(20).optional(),
  isSeparateBusiness: z.boolean().optional(),
});
const locationPatch = z
  .object({
    name: z.string().trim().min(2).max(60),
    email: z.email().nullish(),
    phone: nullableText(20),
    address1: nullableText(120),
    address2: nullableText(120),
    city: nullableText(60),
    postcode: nullableText(20),
    country: z.string().trim().min(2).max(60),
    // GhanaPostGPS, like GA-123-4567.
    digitalAddress: z.string().regex(/^[A-Z]{2}-\d{3,4}-\d{4}$/).nullish(),
    geo: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }).nullish(),
  })
  .partial();

/** A URL-safe slug from a name, made unique by a number when taken ("mamas-kitchen-2"). */
async function freeSlug(db: OwnerDeps['db'], name: string): Promise<string> {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'venue';
  for (let n = 1; n < 100; n += 1) {
    const slug = n === 1 ? base : `${base}-${n}`;
    const [taken] = await db.select({ id: venues.id }).from(venues).where(eq(venues.slug, slug));
    if (!taken) return slug;
  }
  return `${base}-${crypto.randomUUID().slice(0, 6)}`;
}

/** The business, its locations (one venue each) and scanner devices (api/openapi.yaml owner business). */
export function ownerBusinessRoutes(deps: OwnerDeps) {
  const app = new Hono();
  const { db } = deps;

  /** The business the signed-in person works for: the one behind their first venue. */
  const businessOf = async (who: SignedIn) => {
    const [venue] = await db.select().from(venues).where(inArray(venues.id, who.memberships.map((m) => m.venueId))).limit(1);
    const [business] = venue ? await db.select().from(businesses).where(eq(businesses.id, venue.businessId)) : [];
    if (!business) throw new Problem(404, 'not_found', 'No business found.');
    return business;
  };
  const ownsBusiness = async (who: SignedIn, businessId: string) => {
    const owned = who.memberships.filter((m) => m.role === 'owner').map((m) => m.venueId);
    if (owned.length === 0) return false;
    const rows = await db.select({ id: venues.id }).from(venues).where(and(eq(venues.businessId, businessId), inArray(venues.id, owned)));
    return rows.length > 0;
  };
  const businessView = (row: typeof businesses.$inferSelect, ownerId: string) => ({ ...(row.profile as object), id: row.id, name: row.name, plan: row.plan, ownerId });

  const locationOf = async (row: VenueRow) => {
    const address = row.address as Address;
    const profile = row.profile as VenueProfile;
    const [[tables], [staff]] = await Promise.all([
      db.select({ n: count() }).from(diningTables).where(eq(diningTables.venueId, row.id)),
      db.select({ n: count() }).from(staffMemberships).where(and(eq(staffMemberships.venueId, row.id), eq(staffMemberships.status, 'active'))),
    ]);
    return {
      id: row.id,
      businessId: row.businessId,
      slug: row.slug,
      name: row.name,
      email: address.email ?? null,
      phone: address.phone ?? null,
      address1: address.address1 ?? null,
      address2: address.address2 ?? null,
      city: address.city ?? null,
      postcode: address.postcode ?? null,
      country: address.country ?? 'Ghana',
      currency: row.currency,
      venueId: row.id,
      digitalAddress: address.digitalAddress ?? null,
      geo: address.geo ?? null,
      logo: (profile.logo as Image | null | undefined) ?? null,
      tableCount: tables?.n ?? 0,
      staffCount: staff?.n ?? 0,
    };
  };

  app.get('/owner/business', async (c) => {
    const who = await signedIn(c, deps);
    const business = await businessOf(who);
    // Every venue this person works at is a location they can switch to, even when the venues
    // belong to different businesses (the sample venues are three businesses with one owner).
    const rows = await db.select().from(venues).where(inArray(venues.id, who.memberships.map((m) => m.venueId)));
    const [owner] = await db.select({ userId: staffMemberships.userId }).from(staffMemberships).where(and(inArray(staffMemberships.venueId, rows.map((r) => r.id)), eq(staffMemberships.role, 'owner'))).limit(1);
    return c.json({ business: businessView(business, owner?.userId ?? who.user.id), locations: await Promise.all(rows.map(locationOf)) });
  });

  app.patch('/owner/business', async (c) => {
    const who = await signedIn(c, deps);
    const business = await businessOf(who);
    if (!(await ownsBusiness(who, business.id))) throw new Problem(403, 'forbidden', 'Only the owner can change the business.');
    const input = businessPatch.safeParse(await c.req.json().catch(() => null));
    if (!input.success) throw new Problem(422, input.error.issues.some((i) => i.path[0] === 'name') ? 'name_too_short' : 'validation', 'Check the business details.');
    const { name, ...profile } = input.data;
    const [saved] = await db
      .update(businesses)
      .set({ ...(name ? { name } : {}), profile: { ...(business.profile as object), ...profile } })
      .where(eq(businesses.id, business.id))
      .returning();
    return c.json(businessView(saved!, who.user.id));
  });

  /**
   * A new location is a new venue: it starts unpublished, with this venue's look, hours and services
   * to edit, cash on, and the signed-in owner as its owner. A separate business gets its own record.
   */
  app.post('/owner/business/locations', async (c) => {
    const who = await signedIn(c, deps);
    const business = await businessOf(who);
    if (!(await ownsBusiness(who, business.id))) throw new Problem(403, 'forbidden', 'Only the owner can add a location.');
    const input = await body(c, locationInput);
    const [template] = await db.select().from(venues).where(eq(venues.businessId, business.id)).limit(1);
    const businessId = input.isSeparateBusiness ? `bus_${crypto.randomUUID().replaceAll('-', '')}` : business.id;
    if (input.isSeparateBusiness) await db.insert(businesses).values({ id: businessId, name: input.name });
    const id = `ven_${crypto.randomUUID().replaceAll('-', '')}`;
    const { logo: _logo, banner: _banner, socials: _socials, offers: _offers, ...look } = (template?.profile ?? {}) as VenueProfile;
    const [row] = await db
      .insert(venues)
      .values({
        id,
        businessId,
        slug: await freeSlug(db, input.name),
        name: input.name,
        published: false,
        profile: { ...look, offers: [] },
        address: { address1: input.address1 ?? null, city: input.city ?? null, postcode: input.postcode ?? null, country: input.country },
        services: template?.services ?? [],
      })
      .returning();
    await db.insert(paymentSettings).values({ venueId: id, manual: NO_MANUAL });
    await db.insert(staffMemberships).values({ id: `mem_${crypto.randomUUID().replaceAll('-', '')}`, venueId: id, userId: who.user.id, role: 'owner', status: 'active', joinedAt: new Date(deps.now()) });
    return c.json(await locationOf(row!), 201);
  });

  app.patch('/owner/business/locations/:locationId', async (c) => {
    const who = await signedIn(c, deps);
    roleAt(who, c.req.param('locationId'), ROLES.payments);
    const [row] = await db.select().from(venues).where(eq(venues.id, c.req.param('locationId')));
    if (!row) throw new Problem(404, 'not_found', 'Location not found.');
    const input = locationPatch.safeParse(await c.req.json().catch(() => null));
    if (!input.success) {
      const digital = input.error.issues.some((i) => i.path[0] === 'digitalAddress');
      throw new Problem(422, digital ? 'digital_address_not_valid' : 'validation', digital ? 'Use the GhanaPostGPS form, like GA-123-4567.' : 'Check the location details.');
    }
    const { name, geo, ...address } = input.data;
    const profile = row.profile as VenueProfile;
    const [saved] = await db
      .update(venues)
      .set({
        ...(name ? { name } : {}),
        address: { ...(row.address as Address), ...address, ...(geo !== undefined ? { geo } : {}) },
        // Delivery fees measure from the venue's own pin, so it moves with the location's.
        ...(geo !== undefined ? { profile: { ...profile, location: { ...profile.location, lat: geo?.lat, lng: geo?.lng } } } : {}),
      })
      .where(eq(venues.id, row.id))
      .returning();
    return c.json(await locationOf(saved!));
  });

  // ---- scanner devices: shared phones at the door or counter that stamp loyalty cards.
  const managerAt = async (c: Context) => {
    const venueId = c.req.param('venueId') ?? '';
    roleAt(await signedIn(c, deps), venueId, ROLES.menu);
    return venueId;
  };
  const deviceOf = (d: typeof scannerDevices.$inferSelect) => ({
    id: d.id,
    venueId: d.venueId,
    name: d.name,
    platform: d.platform ?? 'Android / iOS',
    pairedAt: d.pairedAt.toISOString(),
    lastSeen: d.lastSeen.toISOString(),
    pairingCode: d.pairingCode,
  });

  app.get('/owner/venues/:venueId/devices', async (c) => {
    const venueId = await managerAt(c);
    const rows = await db.select().from(scannerDevices).where(and(eq(scannerDevices.venueId, venueId), isNull(scannerDevices.revokedAt)));
    return c.json({ items: rows.map(deviceOf) });
  });

  /** Adds a device. Without a code from the device, a 6-digit pairing code is made to type into it. */
  app.post('/owner/venues/:venueId/devices/pair', async (c) => {
    const venueId = await managerAt(c);
    const input = await body(c, z.object({ name: z.string().trim().min(1).max(40), code: z.string().trim().max(12).optional() }));
    const pairingCode = input.code ? null : String(Math.floor(100000 + (crypto.getRandomValues(new Uint32Array(1))[0]! % 900000)));
    const at = new Date(deps.now());
    const [row] = await db
      .insert(scannerDevices)
      .values({ id: `dev_${crypto.randomUUID().replaceAll('-', '')}`, venueId, name: input.name, platform: 'Android / iOS', pairingCode, pairedAt: at, lastSeen: at })
      .returning();
    return c.json(deviceOf(row!));
  });

  app.delete('/owner/venues/:venueId/devices/:deviceId', async (c) => {
    const venueId = await managerAt(c);
    await db.update(scannerDevices).set({ revokedAt: new Date(deps.now()) }).where(and(eq(scannerDevices.id, c.req.param('deviceId')), eq(scannerDevices.venueId, venueId)));
    return c.body(null, 204);
  });

  return app;
}
