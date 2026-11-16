import type { PaymentSettings, Table, VenuePublic } from '@/lib/api/types';
import { defaultPaymentSettings } from './worldLookups';
import { tableLink } from '@/lib/tableLink';
import { env } from '@/lib/env';

/** Small sample data the world starts with: staff details, tables, a test Paystack. */

// Sample shift data for the Staff screen: surname, how long ago they joined and were last seen,
// whether they are on shift, and today's work. Keyed by the last four digits of the phone.
const STAFF_DETAIL: Record<
  string,
  {
    lastName: string;
    joinedDaysAgo: number;
    lastSeenMinutesAgo: number | null;
    onShift: boolean;
    today: {
      ordersHandled: number;
      callsAnswered: number;
      avgPickupMinutes: number | null;
      tipsPesewas?: number;
    };
    tableCodes?: string[];
    hasPin?: boolean;
  }
> = {
  '0001': {
    lastName: 'Owusu',
    joinedDaysAgo: 420,
    lastSeenMinutesAgo: 2,
    onShift: true,
    today: { ordersHandled: 6, callsAnswered: 2, avgPickupMinutes: 3 },
    hasPin: true,
  },
  '0002': {
    lastName: 'Asante',
    joinedDaysAgo: 210,
    lastSeenMinutesAgo: 1,
    onShift: true,
    today: { ordersHandled: 18, callsAnswered: 11, avgPickupMinutes: 2, tipsPesewas: 4500 },
    tableCodes: ['3', '4', '5', '12'],
    hasPin: true,
  },
  '0003': {
    lastName: 'Boateng',
    joinedDaysAgo: 95,
    lastSeenMinutesAgo: 140,
    onShift: false,
    today: { ordersHandled: 23, callsAnswered: 0, avgPickupMinutes: null },
    hasPin: false,
  },
};

export function staffDetail(key: string, now: number) {
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
    tableCodes: d.tableCodes ?? [],
    hasPin: d.hasPin ?? false,
  };
}

export function tablesFor(slug: string, code: string): Table[] {
  const codes = [code, '1', '2', '3', '4', '5', '6', '7', '8'];
  const unique = [...new Set(codes)];
  return unique.map((item) => ({
    id: `tbl_${slug}_${item}`,
    code: item,
    label: `Table ${item}`,
    qrUrl: tableLink(env.EXPO_PUBLIC_SITE_URL, slug, item),
  }));
}

/**
 * Sample data: Mama's Kitchen (the venue the demo opens) and Bean There have connected their own
 * Paystack (test keys), so guests can pay in the app. Auntie Akos takes payment in person, so that
 * case can be tried too.
 */
export function samplePaymentSettings(
  venues: Record<string, VenuePublic>,
  now: number,
): Record<string, PaymentSettings> {
  const at = new Date(now).toISOString();
  const settings: Record<string, PaymentSettings> = {};
  for (const [slug, key] of [
    ['mamas-kitchen', 'pk_test_mamaskitchen0sample'],
    ['bean-there', 'pk_test_beanthere0sample'],
  ] as const) {
    const venue = venues[slug];
    if (!venue) continue;
    settings[venue.id] = {
      ...defaultPaymentSettings(),
      paystack: {
        mode: 'test',
        publicKey: key,
        secretKeyHint: '••••0000',
        connectedAt: at,
        lastCheckedAt: at,
      },
    };
  }
  return settings;
}

/**
 * Menu-link orders (BUILD.md 4b.15). Mama's Kitchen takes pickup and delivery: it has a map pin on
 * Oxford Street, Osu, which delivery needs to work out the distance. Bean There takes pickup only.
 * Auntie Akos takes orders at the table only.
 */
export function withSampleOnlineOrdering(venues: Record<string, VenuePublic>): void {
  const delivery = {
    enabled: false,
    minimumFeePesewas: 1500,
    feePerKmPesewas: 300,
    maxDistanceKm: 8,
    freeOverPesewas: null,
  };
  const mamas = venues['mamas-kitchen'];
  if (mamas) {
    mamas.location = { ...mamas.location, lat: 5.556, lng: -0.1822 };
    mamas.onlineOrdering = {
      enabled: true,
      pickup: { enabled: true, prepMinutes: 20 },
      delivery: { ...delivery, enabled: true, freeOverPesewas: 20000 },
    };
  }
  const bean = venues['bean-there'];
  if (bean) {
    bean.onlineOrdering = { enabled: true, pickup: { enabled: true, prepMinutes: 15 }, delivery };
  }
}
