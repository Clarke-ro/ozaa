import { guestServices } from '../shared/guestServices.ts';
import { and, asc, avg, count, eq, isNull } from 'drizzle-orm';
import type { Db } from '../db/client.ts';
import {
  diningTables,
  loyaltyPrograms,
  menuCategories,
  menuItems,
  modifierGroups,
  paymentSettings,
  venues,
  writtenReviews,
} from '../db/schema.ts';
import { Problem } from '../http/problem.ts';
import { liveNotices } from '../shared/notices.ts';
import { resolveDish } from '../shared/addOns.ts';
import { guestPayMethods } from '../shared/payments.ts';
import type {
  ManualPayments,
  Menu,
  MenuCategory,
  MenuItem,
  ModifierGroup,
  Offer,
  PaymentSettings,
  StoreNotices,
  Table,
  VenuePublic,
  Wifi,
} from '../shared/types.ts';

/**
 * What a venue row's `profile` holds: the guest-facing fields of VenuePublic, plus the owner's
 * full notice settings and the offers list. Saved and read as a whole.
 */
export type VenueProfile = Omit<
  VenuePublic,
  | 'id'
  | 'slug'
  | 'name'
  | 'currency'
  | 'published'
  | 'services'
  | 'payMethods'
  | 'payEnabled'
  | 'notices'
> & { noticeSettings?: StoreNotices; offers?: Offer[] };

type VenueRow = typeof venues.$inferSelect;

export const NO_MANUAL: ManualPayments = {
  cash: true,
  cardMachine: false,
  bankTransfer: { enabled: false },
  momo: { enabled: false },
};

/** The venue's payment settings as the contract shows them. The secret key never leaves here. */
export async function paymentSettingsOf(db: Db, venueId: string): Promise<PaymentSettings> {
  const [row] = await db.select().from(paymentSettings).where(eq(paymentSettings.venueId, venueId));
  if (!row) return { paystack: null, manual: NO_MANUAL };
  return {
    paystack:
      row.paystackMode &&
      row.paystackPublicKey &&
      row.paystackSecretEncrypted &&
      row.paystackSecretHint &&
      row.paystackConnectedAt
        ? {
            mode: row.paystackMode,
            publicKey: row.paystackPublicKey,
            secretKeyHint: row.paystackSecretHint,
            connectedAt: row.paystackConnectedAt.toISOString(),
          }
        : null,
    manual: row.manual as ManualPayments,
    ...(row.feePassing ? { feePassing: row.feePassing as PaymentSettings['feePassing'] } : {}),
  };
}

/** A venue as guests see it: only switched-on services and live notices, how they can pay. */
export async function publicVenue(db: Db, row: VenueRow, now: number): Promise<VenuePublic> {
  const { noticeSettings, offers: _offers, ...profile } = row.profile as VenueProfile;
  const pay = await paymentSettingsOf(db, row.id);
  const [loyalty] = await db
    .select({ programme: loyaltyPrograms.programme })
    .from(loyaltyPrograms)
    .where(eq(loyaltyPrograms.venueId, row.id));
  const [stars] = await db
    .select({ average: avg(writtenReviews.stars), count: count() })
    .from(writtenReviews)
    .where(eq(writtenReviews.venueId, row.id));
  return {
    ...profile,
    id: row.id,
    slug: row.slug,
    name: row.name,
    currency: row.currency,
    published: row.published,
    // Switched on and set up (src/lib/guestServices.ts): no Wi-Fi tile without a network, no
    // Rewards without a programme, no Offers without an offer.
    services: guestServices(row.services as VenuePublic['services'], {
      wifi: Boolean((row.wifi as { ssid?: string } | null)?.ssid),
      loyalty: (loyalty?.programme as { enabled?: boolean } | undefined)?.enabled === true,
      offers: offersOf(row).length > 0,
    }),
    notices: liveNotices(noticeSettings, now),
    payMethods: guestPayMethods(pay),
    payEnabled: pay.paystack !== null,
    rating: ratingOf(stars),
  };
}

/**
 * Every written review counts, the private 1 to 3 stars too, so the number is honest. Shown to
 * one decimal; none yet means no rating rather than a zero.
 */
export function ratingOf(
  stars: { average: string | null; count: number } | undefined,
): VenuePublic['rating'] {
  if (!stars || stars.count === 0 || stars.average === null) return null;
  return { average: Math.round(Number(stars.average) * 10) / 10, count: stars.count };
}

export async function venueRowBySlug(db: Db, slug: string): Promise<VenueRow> {
  const [row] = await db.select().from(venues).where(eq(venues.slug, slug));
  if (!row) throw new Problem(404, 'venue_not_found', 'We could not find that venue.');
  return row;
}

export async function venueRowById(db: Db, id: string): Promise<VenueRow> {
  const [row] = await db.select().from(venues).where(eq(venues.id, id));
  if (!row) throw new Problem(404, 'venue_not_found', 'We could not find that venue.');
  return row;
}

export function offersOf(row: VenueRow): Offer[] {
  return (row.profile as VenueProfile).offers ?? [];
}

export function wifiOf(row: VenueRow): Wifi | null {
  return (row.wifi as Wifi | null) ?? null;
}

type ItemRow = typeof menuItems.$inferSelect;

/** A dish row as the contract's MenuItem: the checked fields, then the shown-as-is details. */
export function itemFromRow(row: ItemRow): MenuItem {
  return {
    ...(row.details as Partial<MenuItem>),
    id: row.id,
    categoryId: row.categoryId,
    name: row.name as MenuItem['name'],
    description: row.description as MenuItem['description'],
    pricePesewas: row.pricePesewas,
    salePricePesewas: row.salePricePesewas,
    available: row.available,
    hidden: row.hidden,
    stockCount: row.stockCount,
    minQuantity: row.minQuantity,
    maxQuantity: row.maxQuantity,
    ...(row.position === null ? {} : { position: row.position }),
    snoozedUntil: row.snoozedUntil?.toISOString() ?? null,
    dietary: (row.details as Partial<MenuItem>).dietary ?? [],
    badges: (row.details as Partial<MenuItem>).badges ?? [],
    modifierGroups: (row.details as Partial<MenuItem>).modifierGroups ?? [],
  };
}

type GroupRow = typeof modifierGroups.$inferSelect;

export function groupFromRow(row: GroupRow): ModifierGroup {
  return {
    id: row.id,
    name: row.name as ModifierGroup['name'],
    min: row.min,
    max: row.max,
    options: row.options as ModifierGroup['options'],
  };
}

/** The venue's add-on library, oldest first. */
export async function libraryOf(db: Db, venueId: string): Promise<ModifierGroup[]> {
  const rows = await db
    .select()
    .from(modifierGroups)
    .where(eq(modifierGroups.venueId, venueId))
    .orderBy(asc(modifierGroups.createdAt), asc(modifierGroups.id));
  return rows.map(groupFromRow);
}

/**
 * The whole menu: owner and guests read the same one; guest screens leave hidden dishes out.
 * Each dish's modifierGroups already holds its library groups, so orders are priced from the
 * same add-ons the guest saw (shared/addOns.ts).
 */
export async function menuOf(db: Db, venueId: string): Promise<Menu> {
  const library = await libraryOf(db, venueId);
  const categories = await db
    .select()
    .from(menuCategories)
    .where(eq(menuCategories.venueId, venueId))
    .orderBy(asc(menuCategories.position));
  const items = await db
    .select()
    .from(menuItems)
    .where(and(eq(menuItems.venueId, venueId), isNull(menuItems.deletedAt)));
  return {
    venueId,
    updatedAt: new Date().toISOString(),
    categories: categories.map((c): MenuCategory => ({
      id: c.id,
      name: c.name as MenuCategory['name'],
      kind: c.kind,
      position: c.position,
      hidden: c.hidden,
      ...(c.schedule ? { schedule: c.schedule as MenuCategory['schedule'] } : {}),
    })),
    items: items.map((row) => resolveDish(itemFromRow(row), library)),
    modifierGroups: library,
  };
}

export async function tableOf(db: Db, venueId: string, code: string): Promise<Table | null> {
  const [row] = await db
    .select()
    .from(diningTables)
    .where(and(eq(diningTables.venueId, venueId), eq(diningTables.code, code)));
  return row ? { id: row.id, code: row.code, label: row.label ?? `Table ${row.code}` } : null;
}
