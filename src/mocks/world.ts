import { blankVenue, samplePhone, seedVenueLoyalty } from '../features/loyalty/facts';
import type { VenueLoyalty } from '../features/loyalty/facts';
import type {
  LoyaltyCard,
  Menu,
  MenuCategory,
  MenuItem,
  Offer,
  Order,
  Table,
  VenuePublic,
  Wifi,
} from '@/lib/api/types';
import loyaltyFile from './fixtures/loyaltyCards.json';
import menusFile from './fixtures/menus.json';
import offersFile from './fixtures/offers.json';
import ordersFile from './fixtures/orders.json';
import venuesFile from './fixtures/venues.json';
import wifiFile from './fixtures/wifi.json';
import { DEMO_LOYALTY_PHONES, STAFF } from './demo';
import { seedHistory } from './seedHistory';
import { seedMembers } from './seedMembers';
import { seedPromos } from './seedPromos';
import { kitchenQueue } from './kitchenQueue';
import type { LiveOrder, World } from './worldTypes';
import { seedOwnerDesk } from './seedOwnerDesk';
import {
  samplePaymentSettings,
  staffDetail,
  tablesFor,
  withSampleOnlineOrdering,
} from './worldSamples';

export { STAFF, type StaffSeed } from './demo';
export type { LiveOrder, World } from './worldTypes';
export {
  defaultPaymentSettings,
  findOrder,
  keepLoyalty,
  nextId,
  publicVenue,
  serviceSettings,
  venueById,
  venueBySlug,
} from './worldLookups';
export type { MenuCategory, MenuItem };

type RecordFile = Record<string, unknown>;

function isRecord(value: unknown): value is RecordFile {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function load<T>(file: unknown, name: string): Record<string, T> {
  if (!isRecord(file)) throw new Error(`${name} fixture is not an object`);
  const copy = structuredClone(file);
  const out: Record<string, T> = {};
  for (const [key, value] of Object.entries(copy)) out[key] = value as T;
  return out;
}

export function createWorld(now: number): World {
  const venues = load<VenuePublic>(venuesFile, 'venues');
  withSampleOnlineOrdering(venues);
  const menus = load<Menu>(menusFile, 'menus');
  const wifi = load<Wifi>(wifiFile, 'wifi');
  const offerLists = load<{ items: Offer[] }>(offersFile, 'offers');
  const orderFile = load<Order>(ordersFile, 'orders');
  const cardFile = load<LoyaltyCard>(loyaltyFile, 'loyalty');
  const offers: Record<string, Offer[]> = {};
  for (const [slug, list] of Object.entries(offerLists)) offers[slug] = list.items;

  // The fixture dates are fixed, so stamp each sample order with the time the mock starts.
  const orders: LiveOrder[] = Object.values(orderFile).map((order) => ({
    order: {
      ...order,
      createdAt: new Date(now - 20_000).toISOString(),
      updatedAt: new Date(now - 20_000).toISOString(),
    },
    receivedAt: now - 20_000,
    manual: false,
  }));
  const paid: [string, string, number][] = [
    ['mamas-kitchen', 'ven_mamas', 82000],
    ['mamas-kitchen', 'ven_mamas', 91000],
    ['mamas-kitchen', 'ven_mamas', 75000],
  ];
  for (const [slug, venueId, amount] of paid) {
    const venue = venues[slug];
    if (!venue) continue;
    orders.push({
      manual: true,
      receivedAt: now,
      order: {
        id: `ord_paid_${amount}`,
        number: 10 + orders.length,
        venueId,
        tableCode: null,
        status: 'served',
        paymentStatus: 'paid',
        lines: [
          {
            id: `oln_paid_${amount}`,
            menuItemId: 'itm_counter',
            name: 'Other tables',
            quantity: 1,
            modifiers: [],
            unitPricePesewas: amount,
            totalPesewas: amount,
            paid: true,
          },
        ],
        subtotalPesewas: amount,
        taxes: [],
        totalPesewas: amount,
        paidPesewas: amount,
        etaMinutes: null,
        createdAt: new Date(now).toISOString(),
        updatedAt: new Date(now).toISOString(),
        readyAt: new Date(now).toISOString(),
      },
    });
  }

  // Tickets after #24 (the guest's own sample order) so the numbers read as one lunch service.
  orders.push(...kitchenQueue(now, 25));

  const loyalty: Record<string, VenueLoyalty> = {};
  const tables: Record<string, Table[]> = {};
  const staff: World['staff'] = [];
  const access = new Map<string, { phone: string; purpose: 'owner_login' | 'guest_loyalty' }>();
  for (const venue of Object.values(venues)) {
    const member = DEMO_LOYALTY_PHONES[venue.slug];
    if (!member) throw new Error(`No sample loyalty member for ${venue.slug}`);
    const phone = samplePhone(member);
    access.set(`acc_guest_loyalty_${phone}`, { phone, purpose: 'guest_loyalty' });
    const seeded = cardFile[venue.slug];
    loyalty[venue.id] = seeded
      ? seedVenueLoyalty(venue.id, seeded, phone)
      : blankVenue(venue.id, venue.currency);
    const sample = orders.find((item) => item.order.venueId === venue.id)?.order.tableCode ?? '1';
    tables[venue.id] = tablesFor(venue.slug, sample);
  }
  for (const person of STAFF) {
    const venue = venues[person.slug];
    if (!venue) continue;
    access.set(`acc_owner_login_${person.phone}`, { phone: person.phone, purpose: 'owner_login' });
    staff.push({
      id: `stf_${person.phone.slice(-4)}`,
      firstName: person.firstName,
      role: person.role,
      phoneMasked: `0${person.phone.slice(4, 6)} *** ${person.phone.slice(-4)}`,
      status: 'active',
      venueId: venue.id,
      phone: person.phone,
      ...staffDetail(person.phone.slice(-4), now),
    });
  }

  const world: World = {
    venues,
    menus,
    wifi,
    notices: {},
    paymentSettings: samplePaymentSettings(venues, now),
    chowdeck: {},
    offers,
    orders,
    calls: [],
    seatedCodes: {},
    written: [],
    transactions: [],
    loyalty,
    staff,
    tables,
    feedback: [],
    customLinks: [],
    business: {
      business: {
        id: 'biz_mamas',
        name: "Mama's Hospitality Group",
        ownerId: 'usr_ama',
        plan: 'free',
        description: 'A family-run group serving home-style Ghanaian food in Accra since 2014.',
        categories: ['restaurant'],
        cuisines: ['Ghanaian', 'Grills', 'Seafood'],
        priceRange: 2,
        yearOpened: 2014,
        website: 'mamasosu.com',
        phone: '0300000000',
        email: 'mama@mamasosu.com',
        tin: 'C0000000000',
        registrationNumber: 'CS000000000',
      },
      locations: [
        {
          id: 'ven_mamas',
          businessId: 'biz_mamas',
          slug: 'mamas-kitchen',
          name: "Mama's Kitchen - Osu",
          address1: '14 Cantonments Rd',
          city: 'Accra',
          country: 'Ghana',
          currency: 'GHS',
          email: 'mama@mamasosu.com',
          phone: '+233240000001',
          postcode: 'GA-042-1234',
          digitalAddress: 'GA-123-4567',
        },
        {
          id: 'ven_bean',
          businessId: 'biz_mamas',
          slug: 'bean-there',
          name: 'Bean There Cafe',
          address1: 'Liberation Rd, Airport',
          city: 'Accra',
          country: 'Ghana',
          currency: 'GHS',
          email: 'bean@mamasosu.com',
          phone: '+233240000004',
          postcode: 'GA-112-5678',
        },
      ],
    },
    devices: [],
    tax: {},
    whatsappAlerts: {},
    promos: [],
    noAutoStamp: new Set(),
    notificationReads: new Map(),
    scanLog: [],
    profiles: new Map(),
    quotes: new Map(),
    payments: new Map(),
    idempotency: new Map(),
    otpFails: new Map(),
    sessions: new Map(),
    access,
    seq: 100,
  };
  seedOwnerDesk(world, now);
  seedHistory(world, now);
  seedMembers(world);
  seedPromos(world, now);
  return world;
}
