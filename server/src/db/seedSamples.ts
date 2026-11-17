import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Db } from './client.ts';
import { eq } from 'drizzle-orm';
import { businesses, diningTables, loyaltyPrograms, menuCategories, menuItems, paymentSettings, staffMemberships, staffUsers, venues } from './schema.ts';
import type { Menu, MenuItem, Offer, OnlineOrdering, VenuePublic, Wifi } from '../shared/types.ts';
import { NO_MANUAL, type VenueProfile } from '../venues/venueData.ts';

const SEED = fileURLToPath(new URL('../../seed', import.meta.url));
// The sample photos' made-up address (the demo build ships the files inside the app). For the real
// server they point at the real app's own copy instead: the web build serves assets/sample at /sample.
const DEMO_MEDIA = 'https://mock.cravins.app/media/';
let mediaBase: string | null = null;
const read = <T>(name: string): Record<string, T> => {
  const text = readFileSync(`${SEED}/${name}.json`, 'utf8');
  return JSON.parse(mediaBase ? text.split(DEMO_MEDIA).join(mediaBase) : text) as Record<string, T>;
};

/**
 * Online ordering for the samples, the same as the demo (src/mocks/worldSamples.ts): Mama's Kitchen
 * pickup and delivery (with a map pin on Oxford Street, Osu), Bean There pickup.
 */
const ONLINE: Record<string, { ordering: OnlineOrdering; pin?: { lat: number; lng: number } }> = {
  'mamas-kitchen': {
    pin: { lat: 5.556, lng: -0.1822 },
    ordering: {
      enabled: true,
      pickup: { enabled: true, prepMinutes: 20 },
      delivery: { enabled: true, minimumFeePesewas: 1500, feePerKmPesewas: 300, maxDistanceKm: 8, freeOverPesewas: 20000 },
    },
  },
  'bean-there': {
    ordering: {
      enabled: true,
      pickup: { enabled: true, prepMinutes: 15 },
      delivery: { enabled: false, minimumFeePesewas: 1500, feePerKmPesewas: 300, maxDistanceKm: 8, freeOverPesewas: null },
    },
  },
};

// Tables 1 to 12 at each sample venue, plus the table each venue's sample order uses.
const TABLE_CODES = Array.from({ length: 12 }, (_, i) => String(i + 1));

/**
 * Puts the three sample venues (Mama's Kitchen, Bean There, Auntie Akos) into the database, with
 * their menus, tables, Wi-Fi and offers. Safe to run again: rows that exist are left alone.
 * No staff and no Paystack keys: owners sign in with Clerk and connect their own keys.
 */
export async function seedSamples(db: Db, options: { siteUrl?: string } = {}): Promise<{ venueIds: string[]; items: number }> {
  mediaBase = options.siteUrl ? `${options.siteUrl.replace(/\/+$/, '')}/sample/` : null;
  const venueFile = read<VenuePublic>('venues');
  const menuFile = read<Menu>('menus');
  const offerFile = read<{ items: Offer[] }>('offers');
  const wifiFile = read<Wifi>('wifi');
  const cardsFile = read<{ programme: Record<string, unknown> }>('loyaltyCards');
  let itemCount = 0;

  for (const [slug, venue] of Object.entries(venueFile)) {
    const { id, name, currency, published, services, payMethods: _p, payEnabled: _e, notices, ...rest } = venue;
    const online = ONLINE[slug];
    const profile: VenueProfile = {
      ...rest,
      location: online?.pin ? { ...rest.location, ...online.pin } : rest.location,
      ...(online ? { onlineOrdering: online.ordering } : {}),
      ...(notices ? { noticeSettings: notices } : {}),
      offers: offerFile[slug]?.items ?? [],
    };
    const businessId = `bus_${slug.replace(/-/g, '_')}`;
    await db.insert(businesses).values({ id: businessId, name }).onConflictDoNothing();
    await db
      .insert(venues)
      .values({
        id,
        businessId,
        slug,
        name,
        currency,
        published: published ?? true,
        profile,
        services,
        wifi: wifiFile[slug] ?? null,
      })
      .onConflictDoNothing();
    await db.insert(paymentSettings).values({ venueId: id, manual: NO_MANUAL }).onConflictDoNothing();
    for (const code of TABLE_CODES) {
      await db
        .insert(diningTables)
        .values({ id: `tbl_${slug}_${code}`, venueId: id, code, label: `Table ${code}` })
        .onConflictDoNothing();
    }

    // The sample loyalty programme (its rewards and tiers), with no members: those are real guests.
    const loyalty = cardsFile[slug]?.programme;
    if (loyalty) await db.insert(loyaltyPrograms).values({ venueId: id, programme: { ...loyalty, memberCount: 0 } }).onConflictDoNothing();

    const menu = menuFile[slug];
    if (!menu) continue;
    for (const category of menu.categories) {
      await db
        .insert(menuCategories)
        .values({
          id: category.id,
          venueId: id,
          name: category.name,
          kind: category.kind,
          position: category.position,
          hidden: category.hidden ?? false,
          schedule: category.schedule ?? null,
        })
        .onConflictDoNothing();
    }
    for (const item of menu.items) {
      await db.insert(menuItems).values(itemRow(id, item)).onConflictDoNothing();
      itemCount += 1;
    }
  }
  return { venueIds: Object.values(venueFile).map((venue) => venue.id), items: itemCount };
}

/** A contract MenuItem as a row: checked fields in columns, the rest as details. */
export function itemRow(venueId: string, item: MenuItem): typeof menuItems.$inferInsert {
  const {
    id,
    categoryId,
    name,
    description,
    pricePesewas,
    salePricePesewas,
    available,
    hidden,
    stockCount,
    minQuantity,
    maxQuantity,
    position,
    ...details
  } = item;
  return {
    id,
    venueId,
    categoryId,
    name,
    description,
    pricePesewas,
    salePricePesewas: salePricePesewas ?? null,
    available,
    hidden: hidden ?? false,
    stockCount: stockCount ?? null,
    minQuantity: minQuantity ?? 1,
    maxQuantity: maxQuantity ?? 50,
    position: position ?? null,
    details,
  };
}

/**
 * The owner of the sample venues, from the server's settings (SAMPLE_OWNER_PHONE), never from git:
 * phone numbers and emails are personal data. SAMPLE_OWNER_EMAIL is the address they sign in with. They become owner at each sample venue; the invite turns active
 * the first time they sign in with Clerk using that number. Safe to run again.
 */
export async function seedOwner(
  db: Db,
  input: { phone: string; email?: string; firstName: string; venueIds: string[] },
): Promise<void> {
  const local = input.phone.replace(/\s+/g, '');
  const phone = /^0\d{9}$/.test(local) ? `+233${local.slice(1)}` : local;
  if (!/^\+233\d{9}$/.test(phone)) throw new Error('SAMPLE_OWNER_PHONE must be a Ghana number, like 024 123 4567.');
  const email = input.email?.trim().toLowerCase() || null;
  await db.insert(staffUsers).values({ id: 'usr_sample_owner', phone, email, firstName: input.firstName }).onConflictDoNothing();
  const [user] = await db.select().from(staffUsers).where(eq(staffUsers.phone, phone));
  if (!user) return;
  // They sign in by email code: add or change the email on a run after the first.
  if (email && user.email !== email) await db.update(staffUsers).set({ email }).where(eq(staffUsers.id, user.id));
  for (const venueId of input.venueIds) {
    await db
      .insert(staffMemberships)
      .values({ id: `mem_${venueId}_${user.id}`, venueId, userId: user.id, role: 'owner', status: 'invited' })
      .onConflictDoNothing();
  }
}
