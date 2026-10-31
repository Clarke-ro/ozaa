import { ApiError } from '@/lib/api/errors';
import type {
  LoyaltyCard,
  LoyaltyMember,
  LoyaltyProgram,
  Menu,
  MenuCategory,
  MenuItem,
  Offer,
  Order,
  PayoutAccount,
  ServiceSettings,
  StaffMember,
  StaffRole,
  Story,
  Table,
  VenuePublic,
  VideoReview,
  WaiterCall,
  Wifi,
} from '@/lib/api/types';
import loyaltyFile from './fixtures/loyaltyCards.json';
import menusFile from './fixtures/menus.json';
import offersFile from './fixtures/offers.json';
import ordersFile from './fixtures/orders.json';
import storiesFile from './fixtures/stories.json';
import venuesFile from './fixtures/venues.json';
import wifiFile from './fixtures/wifi.json';

export type StaffSeed = {
  phone: string;
  role: StaffRole;
  firstName: string;
  slug: string;
};

export const STAFF: StaffSeed[] = [
  { phone: '+233240000001', role: 'owner', firstName: 'Ama', slug: 'mamas-kitchen' },
  { phone: '+233240000002', role: 'waiter', firstName: 'Kwesi', slug: 'mamas-kitchen' },
  { phone: '+233240000003', role: 'kitchen', firstName: 'Yaw', slug: 'mamas-kitchen' },
  { phone: '+233240000004', role: 'owner', firstName: 'Kojo', slug: 'bean-there' },
  { phone: '+233240000005', role: 'owner', firstName: 'Akosua', slug: 'auntie-akos' },
];

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

export type LiveOrder = { order: Order; receivedAt: number; manual: boolean };

export type World = {
  venues: Record<string, VenuePublic>;
  menus: Record<string, Menu>;
  wifi: Record<string, Wifi>;
  stories: Record<string, Story[]>;
  offers: Record<string, Offer[]>;
  orders: LiveOrder[];
  calls: WaiterCall[];
  cards: Record<string, LoyaltyCard>;
  members: LoyaltyMember[];
  programs: Record<string, LoyaltyProgram>;
  payouts: Record<string, PayoutAccount>;
  staff: (StaffMember & { venueId: string; phone: string })[];
  videos: VideoReview[];
  tables: Record<string, Table[]>;
  quotes: Map<string, { orderId: string; share: number; tip: number; lineIds: string[]; expiresAt: number }>;
  payments: Map<string, { payment: import('@/lib/api/types').Payment; phone: string; applied: boolean }>;
  idempotency: Map<string, unknown>;
  otpFails: Map<string, number>;
  uploads: Set<string>;
  sessions: Map<string, { slug: string; tableCode: string | null; orderId: string | null }>;
  access: Map<string, { phone: string; purpose: 'owner_login' | 'guest_loyalty' }>;
  refresh: Map<string, string>;
  seq: number;
};

function tablesFor(slug: string, code: string): Table[] {
  const codes = [code, '1', '2', '3', '4', '5', '6', '7', '8'];
  const unique = [...new Set(codes)];
  return unique.map((item) => ({
    id: `tbl_${slug}_${item}`,
    code: item,
    label: `Table ${item}`,
    qrUrl: `https://ozaa.app/${slug}/t/${item}`,
  }));
}

function programFor(venue: VenuePublic, memberCount: number): LoyaltyProgram {
  const needed = venue.loyaltySummary?.stampsNeeded ?? 8;
  const title = venue.loyaltySummary?.rewardTitle ?? 'A free plate';
  return {
    enabled: true,
    stampsNeeded: needed,
    reward: { id: `rwd_${venue.slug}`, title, stampsNeeded: needed },
    stampRule: 'one_per_paid_order',
    memberCount,
  };
}

export function createWorld(now: number): World {
  const venues = load<VenuePublic>(venuesFile, 'venues');
  const menus = load<Menu>(menusFile, 'menus');
  const wifi = load<Wifi>(wifiFile, 'wifi');
  const storyLists = load<{ items: Story[] }>(storiesFile, 'stories');
  const offerLists = load<{ items: Offer[] }>(offersFile, 'offers');
  const orderFile = load<Order>(ordersFile, 'orders');
  const cardFile = load<LoyaltyCard>(loyaltyFile, 'loyalty');
  const stories: Record<string, Story[]> = {};
  const offers: Record<string, Offer[]> = {};
  for (const [slug, list] of Object.entries(storyLists)) stories[slug] = list.items;
  for (const [slug, list] of Object.entries(offerLists)) offers[slug] = list.items;

  const orders: LiveOrder[] = Object.values(orderFile).map((order) => ({
    order,
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

  const cards: Record<string, LoyaltyCard> = {};
  const members: LoyaltyMember[] = [];
  for (const [slug, card] of Object.entries(cardFile)) {
    const phone = slug === 'mamas-kitchen' ? '+233244000099' : slug === 'bean-there' ? '+233204000099' : '+233274000099';
    cards[`${slug}:${phone}`] = card;
    members.push({
      id: `mem_${slug}`,
      firstName: 'Ama',
      phoneMasked: '024 *** 0099',
      stamps: card.stamps,
      visits: card.stamps,
      marketingConsent: card.consent.marketing,
      joinedAt: `${card.memberSince}T00:00:00Z`,
    });
  }

  const programs: Record<string, LoyaltyProgram> = {};
  const payouts: Record<string, PayoutAccount> = {};
  const tables: Record<string, Table[]> = {};
  const staff: World['staff'] = [];
  for (const venue of Object.values(venues)) {
    programs[venue.id] = programFor(venue, members.filter((member) => member.id.endsWith(venue.slug)).length);
    payouts[venue.id] = {
      businessName: venue.name,
      settlementType: 'momo',
      accountMasked: '024 *** 0001',
      verified: true,
      // Clarke has not set Ozaa's fee yet. The sample shows 0 until he does.
      ozaaFeePercent: 0,
    };
    const sample = orders.find((item) => item.order.venueId === venue.id)?.order.tableCode ?? '1';
    tables[venue.id] = tablesFor(venue.slug, sample);
  }
  for (const person of STAFF) {
    const venue = venues[person.slug];
    if (!venue) continue;
    staff.push({
      id: `stf_${person.phone.slice(-4)}`,
      firstName: person.firstName,
      role: person.role,
      phoneMasked: `0${person.phone.slice(4, 6)} *** ${person.phone.slice(-4)}`,
      status: 'active',
      venueId: venue.id,
      phone: person.phone,
    });
  }

  return {
    venues,
    menus,
    wifi,
    stories,
    offers,
    orders,
    calls: [],
    cards,
    members,
    programs,
    payouts,
    staff,
    videos: [],
    tables,
    quotes: new Map(),
    payments: new Map(),
    idempotency: new Map(),
    otpFails: new Map(),
    uploads: new Set(),
    sessions: new Map(),
    access: new Map(),
    refresh: new Map(),
    seq: 100,
  };
}

export function venueBySlug(world: World, slug: string): VenuePublic {
  const venue = world.venues[slug];
  if (!venue || ['owner', 'api', 'legal', 'help'].includes(slug)) {
    throw new ApiError(404, 'venue_not_found', 'Venue not found');
  }
  return venue;
}

export function venueById(world: World, venueId: string): VenuePublic {
  const venue = Object.values(world.venues).find((item) => item.id === venueId);
  if (!venue) throw new ApiError(404, 'venue_not_found', 'Venue not found');
  return venue;
}

export function publicVenue(venue: VenuePublic): VenuePublic {
  return { ...venue, services: venue.services.filter((service) => service.enabled) };
}

export function nextId(world: World, prefix: string): string {
  world.seq += 1;
  return `${prefix}_${world.seq}`;
}

export function findOrder(world: World, orderId: string): LiveOrder {
  const live = world.orders.find((item) => item.order.id === orderId);
  if (!live) throw new ApiError(404, 'order_not_found', 'Order not found');
  return live;
}

export function serviceSettings(venue: VenuePublic): ServiceSettings {
  return { services: venue.services, game: venue.game ?? { enabled: false, minScore: 15 } };
}

export function slugForVenueId(world: World, venueId: string): string {
  return venueById(world, venueId).slug;
}

export type { MenuCategory, MenuItem };
