import { and, asc, eq, isNull } from 'drizzle-orm';
import type { Db } from '../db/client.ts';
import { diningTables, menuCategories, menuItems, paymentSettings, venues } from '../db/schema.ts';
import { Problem } from '../http/problem.ts';
import { liveNotices } from '../shared/notices.ts';
import { guestPayMethods } from '../shared/payments.ts';
import type {
  ManualPayments,
  Menu,
  MenuCategory,
  MenuItem,
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
  'id' | 'slug' | 'name' | 'currency' | 'published' | 'services' | 'payMethods' | 'payEnabled' | 'notices'
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
      row.paystackMode && row.paystackPublicKey && row.paystackSecretEncrypted && row.paystackSecretHint && row.paystackConnectedAt
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
  return {
    ...profile,
    id: row.id,
    slug: row.slug,
    name: row.name,
    currency: row.currency,
    published: row.published,
    services: (row.services as VenuePublic['services']).filter((service) => service.enabled),
    notices: liveNotices(noticeSettings, now),
    payMethods: guestPayMethods(pay),
    payEnabled: pay.paystack !== null,
  };
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
    dietary: (row.details as Partial<MenuItem>).dietary ?? [],
    badges: (row.details as Partial<MenuItem>).badges ?? [],
    modifierGroups: (row.details as Partial<MenuItem>).modifierGroups ?? [],
  };
}

/** The whole menu: owner and guests read the same one; guest screens leave hidden dishes out. */
export async function menuOf(db: Db, venueId: string): Promise<Menu> {
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
    categories: categories.map(
      (c): MenuCategory => ({
        id: c.id,
        name: c.name as MenuCategory['name'],
        kind: c.kind,
        position: c.position,
        hidden: c.hidden,
        ...(c.schedule ? { schedule: c.schedule as MenuCategory['schedule'] } : {}),
      }),
    ),
    items: items.map(itemFromRow),
  };
}

export async function tableOf(db: Db, venueId: string, code: string): Promise<Table | null> {
  const [row] = await db
    .select()
    .from(diningTables)
    .where(and(eq(diningTables.venueId, venueId), eq(diningTables.code, code)));
  return row ? { id: row.id, code: row.code, label: row.label ?? `Table ${row.code}` } : null;
}
