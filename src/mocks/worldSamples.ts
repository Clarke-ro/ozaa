import type { PaymentSettings, Table, VenuePublic } from '@/lib/api/types';
import { defaultPaymentSettings } from './worldLookups';

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
    qrUrl: `https://cravins.app/${slug}/t/${item}`,
  }));
}

/**
 * Sample data: Bean There has connected its own Paystack (test keys), so the demo shows a guest
 * paying in the app. Mama's Kitchen and Auntie Akos take payment in person.
 */
export function samplePaymentSettings(
  venues: Record<string, VenuePublic>,
  now: number,
): Record<string, PaymentSettings> {
  const bean = Object.values(venues).find((venue) => venue.slug === 'bean-there');
  if (!bean) return {};
  const at = new Date(now).toISOString();
  return {
    [bean.id]: {
      ...defaultPaymentSettings(),
      paystack: {
        mode: 'test',
        publicKey: 'pk_test_beanthere0sample',
        secretKeyHint: '••••0000',
        connectedAt: at,
        lastCheckedAt: at,
      },
    },
  };
}

/**
 * Bean There takes menu-link orders for pickup, so the demo shows online ordering (BUILD.md 4b.15).
 * Delivery stays off: the sample venue has no map pin, and delivery needs one to work out distance.
 * Mama's Kitchen and Auntie Akos take orders at the table only.
 */
export function withSampleOnlineOrdering(venues: Record<string, VenuePublic>): void {
  const bean = venues['bean-there'];
  if (!bean) return;
  bean.onlineOrdering = {
    enabled: true,
    pickup: { enabled: true, prepMinutes: 15 },
    delivery: { enabled: false, minimumFeePesewas: 1500, feePerKmPesewas: 300, maxDistanceKm: 8, freeOverPesewas: null },
  };
}
