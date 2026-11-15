import type { StaffRole } from '@/lib/api/types';

/**
 * The sample people, places and scores for demo builds (EXPO_PUBLIC_API_MODE=mock), in one place so
 * every screen tells the same story. Real builds never show any of it: screens check DEMO in
 * src/lib/demo.ts first. Menus, orders and venues are in api/fixtures/*.json.
 */

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

/** Every sample sign-in (owner, staff and loyalty member) takes this code. */
export const DEMO_CODE = '123456';

/** The table the landing page opens, so someone without a QR code can try the guest app. */
export const DEMO_TABLE_PATH = '/mamas-kitchen/t/12';

/** One sample loyalty member per venue, with stamps already on the card. */
export const DEMO_LOYALTY_PHONES: Record<string, string> = {
  'mamas-kitchen': '+233244000099',
  'bean-there': '+233204000099',
  'auntie-akos': '+233274000099',
};

/**
 * The sample venues' names, for the sign-in shortcuts. Kept here rather than read from
 * venues.json so a screen that shows the shortcuts doesn't pull the whole fixture into the
 * bundle. demo.test.ts checks they match the fixture.
 */
export const DEMO_VENUE_NAMES: Record<string, string> = {
  'mamas-kitchen': "Mama's Kitchen",
  'bean-there': 'Bean There',
  'auntie-akos': 'Auntie Akos Chop Bar',
};

/** Sign-in shortcuts on the owner login: an owner at two venues, and a waiter. */
export const DEMO_LOGINS = ['+233240000001', '+233240000004', '+233240000002'].map((phone) => {
  const person = STAFF.find((staff) => staff.phone === phone);
  if (!person) throw new Error(`No sample staff with ${phone}`);
  return { ...person, venueName: DEMO_VENUE_NAMES[person.slug] ?? person.slug };
});

/** Made-up scores so the game's board isn't empty on a first visit. Marked "sample" on screen. */
export const DEMO_BOARD = [
  { nickname: 'Kwame', score: 23, sample: true },
  { nickname: 'Ama', score: 19, sample: true },
  { nickname: 'Yaw', score: 16, sample: true },
  { nickname: 'Esi', score: 12, sample: true },
  { nickname: 'Kojo', score: 9, sample: true },
] as const;
