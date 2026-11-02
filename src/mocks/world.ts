import {
  apply,
  blankVenue,
  featured,
  LOYALTY_PROBLEMS,
  samplePhone,
  seedVenueLoyalty,
  type Command,
  type VenueLoyalty,
} from '../features/loyalty/facts';
import { ApiError } from '@/lib/api/errors';
import type {
  LoyaltyCard,
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
  VenueTransaction,
  VideoReview,
  WaiterCall,
  Wifi,
  WrittenReview,
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
  calls: (WaiterCall & { venueId: string })[];
  seatedCodes: Record<string, string[]>;
  yesterdayPesewas: Record<string, number>;
  written: (WrittenReview & { venueId: string })[];
  transactions: (VenueTransaction & { venueId: string })[];
  loyalty: Record<string, VenueLoyalty>;
  payouts: Record<string, PayoutAccount>;
  staff: (StaffMember & { venueId: string; phone: string })[];
  videos: (VideoReview & { venueId: string })[];
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

function seedOwnerDesk(world: World, now: number): void {
  for (const [slug, stories] of Object.entries(world.stories)) {
    const venue = world.venues[slug];
    if (!venue) continue;
    stories.forEach((story) => {
      world.videos.push({
        ...story,
        state: 'featured',
        featureConsent: true,
        orderNumber: null,
        venueId: venue.id,
      });
    });
  }

  const mama = world.venues['mamas-kitchen'];
  if (!mama) return;
  const poster = mama.banner;
  world.videos.push({
    id: 'vrv_mamaspending',
    venueId: mama.id,
    firstName: 'Abena',
    stars: 4,
    quote: 'The jollof was smoky and the chicken was hot.',
    postedAt: new Date(now).toISOString(),
    poster,
    video: { mp4Url: 'https://mock.ozaa.app/media/media/review-ama.mp4', durationSeconds: 16 },
    sample: true,
    state: 'pending',
    featureConsent: true,
    orderNumber: 24,
  });
  world.seatedCodes[mama.id] = ['7'];
  world.yesterdayPesewas[mama.id] = 221429;
  world.calls.push({
    id: 'wcl_mamas4',
    venueId: mama.id,
    tableCode: '4',
    reason: 'water',
    status: 'open',
    staffFirstName: null,
    createdAt: new Date(now - 4 * 60_000).toISOString(),
  });
  world.orders.push({
    manual: true,
    receivedAt: now,
    order: {
      id: 'ord_mamasbill',
      number: 18,
      venueId: mama.id,
      tableCode: '3',
      status: 'served',
      paymentStatus: 'unpaid',
      lines: [
        {
          id: 'oln_bill',
          menuItemId: 'itm_mamas0',
          name: 'Jollof & chicken',
          quantity: 1,
          modifiers: [],
          unitPricePesewas: 4500,
          totalPesewas: 4500,
          paid: false,
        },
      ],
      subtotalPesewas: 4500,
      taxes: [],
      totalPesewas: 4500,
      paidPesewas: 0,
      etaMinutes: null,
      createdAt: new Date(now - 40 * 60_000).toISOString(),
      updatedAt: new Date(now - 15 * 60_000).toISOString(),
      readyAt: new Date(now - 20 * 60_000).toISOString(),
    },
  });
  const paid = world.orders.filter((item) => item.order.venueId === mama.id && item.order.paymentStatus === 'paid');
  const methods = ['momo', 'card', 'cash'] as const;
  paid.forEach((item, index) => {
    const method = methods[index % methods.length] ?? 'momo';
    world.transactions.push({
      id: `txn_mama${index}`,
      venueId: mama.id,
      reference: `ref_mama${index}`,
      orderId: item.order.id,
      orderNumber: item.order.number,
      method,
      provider: method === 'momo' ? 'mtn' : undefined,
      amountPesewas: item.order.paidPesewas,
      currency: 'GHS',
      status: 'succeeded',
      settlement: index === 0 ? 'pending' : 'settled',
      createdAt: item.order.createdAt,
      testMode: true,
    });
  });
  world.written.push(
    {
      id: 'rev_mamas1',
      venueId: mama.id,
      stars: 5,
      firstName: 'Efua',
      text: 'The waakye was hot and the shito was perfect.',
      highlights: ['food'],
      createdAt: new Date(now - 2 * 60 * 60_000).toISOString(),
      reply: null,
    },
    {
      id: 'rev_mamas2',
      venueId: mama.id,
      stars: 2,
      firstName: 'Kojo',
      text: 'We waited a long time for the bill.',
      highlights: ['speed'],
      createdAt: new Date(now - 5 * 60 * 60_000).toISOString(),
      reply: null,
    },
  );
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

  const loyalty: Record<string, VenueLoyalty> = {};
  const payouts: Record<string, PayoutAccount> = {};
  const tables: Record<string, Table[]> = {};
  const staff: World['staff'] = [];
  const access = new Map<string, { phone: string; purpose: 'owner_login' | 'guest_loyalty' }>();
  for (const venue of Object.values(venues)) {
    const phone = samplePhone(
      venue.slug === 'mamas-kitchen'
        ? '+233244000099'
        : venue.slug === 'bean-there'
          ? '+233204000099'
          : '+233274000099',
    );
    access.set(`acc_guest_loyalty_${phone}`, { phone, purpose: 'guest_loyalty' });
    const seeded = cardFile[venue.slug];
    loyalty[venue.id] = seeded ? seedVenueLoyalty(venue.id, seeded, phone) : blankVenue(venue.id, venue.currency);
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
    access.set(`acc_owner_login_${person.phone}`, { phone: person.phone, purpose: 'owner_login' });
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

  const world: World = {
    venues,
    menus,
    wifi,
    stories,
    offers,
    orders,
    calls: [],
    seatedCodes: {},
    yesterdayPesewas: {},
    written: [],
    transactions: [],
    loyalty,
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
    access,
    refresh: new Map(),
    seq: 100,
  };
  seedOwnerDesk(world, now);
  return world;
}

export function keepLoyalty(
  world: World,
  venueId: string,
  command: Command,
  nowIso: string,
): { venue: VenueLoyalty; effect: 'posted' | 'duplicate' | 'skipped'; memberId: string | null } {
  const place = venueById(world, venueId);
  const current = world.loyalty[venueId] ?? blankVenue(venueId, place.currency);
  const step = apply(current, command, nowIso);
  if (!step.ok) {
    const problem = LOYALTY_PROBLEMS[step.error.code];
    throw new ApiError(problem.status, step.error.code, problem.title);
  }
  world.loyalty[venueId] = step.next;
  if (command.type === 'save_programme') {
    const best = featured(step.next.programme);
    world.venues[place.slug] = {
      ...place,
      loyaltySummary: step.next.programme.enabled && best
        ? { stampsNeeded: best.cost, rewardTitle: best.title }
        : null,
    };
  }
  return { venue: step.next, effect: step.effect, memberId: step.memberId };
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
