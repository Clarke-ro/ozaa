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
import { liveNotices } from '@/lib/notices';
import { guestPayMethods } from '@/lib/payments';
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
  StoreNotices,
  PaymentSettings,
  Table,
  VenuePublic,
  Business,
  CustomLink,
  FeedbackItem,
  Location,
  ScannerDevice,
  VenueTransaction,
  WaiterCall,
  Wifi,
  WrittenReview,
} from '@/lib/api/types';
import loyaltyFile from './fixtures/loyaltyCards.json';
import menusFile from './fixtures/menus.json';
import offersFile from './fixtures/offers.json';
import ordersFile from './fixtures/orders.json';
import venuesFile from './fixtures/venues.json';
import wifiFile from './fixtures/wifi.json';
import { kitchenQueue } from './kitchenQueue';

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

// Sample shift data for the Staff screen: surname, how long ago they joined and were last seen,
// whether they are on shift, and today's work. Keyed by the last four digits of the phone.
const STAFF_DETAIL: Record<
  string,
  {
    lastName: string;
    joinedDaysAgo: number;
    lastSeenMinutesAgo: number | null;
    onShift: boolean;
    today: { ordersHandled: number; callsAnswered: number; avgPickupMinutes: number | null };
  }
> = {
  '0001': {
    lastName: 'Owusu',
    joinedDaysAgo: 420,
    lastSeenMinutesAgo: 2,
    onShift: true,
    today: { ordersHandled: 6, callsAnswered: 2, avgPickupMinutes: 3 },
  },
  '0002': {
    lastName: 'Asante',
    joinedDaysAgo: 210,
    lastSeenMinutesAgo: 1,
    onShift: true,
    today: { ordersHandled: 18, callsAnswered: 11, avgPickupMinutes: 2 },
  },
  '0003': {
    lastName: 'Boateng',
    joinedDaysAgo: 95,
    lastSeenMinutesAgo: 140,
    onShift: false,
    today: { ordersHandled: 23, callsAnswered: 0, avgPickupMinutes: null },
  },
};

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
  /** Store notices as the owner set them, by venue slug. Guests only get the live ones. */
  notices: Record<string, StoreNotices>;
  /** Payment settings by venue id. Like the real server, never the secret key itself. */
  paymentSettings: Record<string, PaymentSettings>;
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
  tables: Record<string, Table[]>;
  feedback: (FeedbackItem & { venueId: string })[];
  customLinks: (CustomLink & { venueId: string })[];
  business: { business: Business; locations: Location[] };
  devices: (ScannerDevice & { venueId: string })[];
  quotes: Map<
    string,
    { orderId: string; share: number; tip: number; lineIds: string[]; expiresAt: number }
  >;
  payments: Map<
    string,
    { payment: import('@/lib/api/types').Payment; phone: string; applied: boolean }
  >;
  idempotency: Map<string, unknown>;
  otpFails: Map<string, number>;
  sessions: Map<
    string,
    { slug: string; tableCode: string | null; orderId: string | null; startedAt: string }
  >;
  /** Sample visits already counted today, so the demo isn't empty. Real visits add to it. */
  visitorBase: Record<string, number>;
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
    qrUrl: `https://cravins.app/${slug}/t/${item}`,
  }));
}

function seedOwnerDesk(world: World, now: number): void {
  const mama = world.venues['mamas-kitchen'];
  if (!mama) return;
  world.seatedCodes[mama.id] = ['7'];
  world.yesterdayPesewas[mama.id] = 221429;
  world.visitorBase[mama.id] = 37;

  // Seed feedback
  world.feedback.push(
    {
      id: 'fbk_1',
      venueId: mama.id,
      sentiment: 'positive',
      score: 5,
      text: 'The grilled tilapia and hot pepper was incredible! Best in Osu.',
      photoUrl: null,
      contactName: 'Kofi Mensah',
      contactPhone: '+233241234567',
      archived: false,
      visibleAfter: new Date(now - 12 * 3600_000).toISOString(),
      createdAt: new Date(now - 14 * 3600_000).toISOString(),
    },
    {
      id: 'fbk_2',
      venueId: mama.id,
      sentiment: 'neutral',
      score: 3,
      text: 'Food took about 25 minutes to arrive on a busy Friday night.',
      photoUrl: null,
      contactName: null,
      contactPhone: null,
      archived: false,
      visibleAfter: new Date(now - 3 * 3600_000).toISOString(),
      createdAt: new Date(now - 5 * 3600_000).toISOString(),
    },
    {
      id: 'fbk_3',
      venueId: mama.id,
      sentiment: 'negative',
      score: 2,
      text: 'The kelewele was a bit too salty and we waited long for the bill.',
      photoUrl: null,
      contactName: 'Esi Boateng',
      contactPhone: '+233209876543',
      archived: false,
      visibleAfter: new Date(now - 1 * 3600_000).toISOString(),
      createdAt: new Date(now - 2 * 3600_000).toISOString(),
    },
    {
      id: 'fbk_4',
      venueId: mama.id,
      sentiment: 'negative',
      score: 1,
      text: 'Recent feedback test note that is still held in anonymity delay window.',
      photoUrl: null,
      contactName: null,
      contactPhone: null,
      archived: false,
      visibleAfter: new Date(now + 4 * 3600_000).toISOString(),
      createdAt: new Date(now - 30 * 60_000).toISOString(),
    },
  );

  // Seed custom links
  world.customLinks.push(
    {
      id: 'lnk_1',
      venueId: mama.id,
      title: 'Reserve Weekend Table',
      url: 'https://mamas.kitchen/reserve',
      icon: 'calendar',
      placement: 'button',
      startDate: null,
      endDate: null,
      sortOrder: 1,
      clicks: 42,
      enabled: true,
    },
    {
      id: 'lnk_2',
      venueId: mama.id,
      title: 'Follow our Instagram',
      url: 'https://instagram.com/mamas_kitchen_gh',
      icon: 'instagram',
      placement: 'button',
      startDate: null,
      endDate: null,
      sortOrder: 2,
      clicks: 128,
      enabled: true,
    },
  );

  // Seed paired scanner device
  world.devices.push({
    id: 'dev_ipad1',
    venueId: mama.id,
    name: 'Floor iPad Pro (Register)',
    platform: 'iOS 18.2',
    pairedAt: new Date(now - 7 * 86400_000).toISOString(),
    lastSeen: new Date(now - 10 * 60_000).toISOString(),
    pairingCode: null,
  });
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
  const paid = world.orders.filter(
    (item) => item.order.venueId === mama.id && item.order.paymentStatus === 'paid',
  );
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

function staffDetail(key: string, now: number) {
  const d = STAFF_DETAIL[key];
  if (!d) return {};
  return {
    lastName: d.lastName,
    joinedAt: new Date(now - d.joinedDaysAgo * 86_400_000).toISOString(),
    lastActiveAt:
      d.lastSeenMinutesAgo == null
        ? null
        : new Date(now - d.lastSeenMinutesAgo * 60_000).toISOString(),
    onShift: d.onShift,
    today: d.today,
  };
}

export function createWorld(now: number): World {
  const venues = load<VenuePublic>(venuesFile, 'venues');
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
    loyalty[venue.id] = seeded
      ? seedVenueLoyalty(venue.id, seeded, phone)
      : blankVenue(venue.id, venue.currency);
    payouts[venue.id] = {
      businessName: venue.name,
      settlementType: 'momo',
      accountMasked: '024 *** 0001',
      verified: true,
      // Clarke has not set Cravins's fee yet. The sample shows 0 until he does.
      cravinsFeePercent: 0,
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
      ...staffDetail(person.phone.slice(-4), now),
    });
  }

  const world: World = {
    venues,
    menus,
    wifi,
    notices: {},
    paymentSettings: {},
    offers,
    orders,
    calls: [],
    seatedCodes: {},
    yesterdayPesewas: {},
    visitorBase: {},
    written: [],
    transactions: [],
    loyalty,
    payouts,
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
    quotes: new Map(),
    payments: new Map(),
    idempotency: new Map(),
    otpFails: new Map(),
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
      loyaltySummary:
        step.next.programme.enabled && best
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

/** A new venue takes cash and nothing else until the owner sets up more. */
export function defaultPaymentSettings(): PaymentSettings {
  return {
    paystack: null,
    manual: {
      cash: true,
      cardMachine: false,
      bankTransfer: { enabled: false },
      momo: { enabled: false },
    },
  };
}

export function publicVenue(
  venue: VenuePublic,
  notices: StoreNotices | undefined,
  now: number,
  payment: PaymentSettings = defaultPaymentSettings(),
): VenuePublic {
  return {
    ...venue,
    services: venue.services.filter((service) => service.enabled),
    // Like the server: guests get only what should show right now.
    notices: liveNotices(notices, now),
    // Guests learn how they can pay; never a key.
    payMethods: guestPayMethods(payment),
    payEnabled: payment.paystack !== null,
  };
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

export type { MenuCategory, MenuItem };
