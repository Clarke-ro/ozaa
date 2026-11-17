import { createApp } from '../app.ts';
import { staffMemberships, staffUsers } from '../db/schema.ts';
import { seedOwner, seedSamples } from '../db/seedSamples.ts';
import { testDb } from '../db/testDb.ts';
import type { VerifyOwner } from '../owner/clerk.ts';
import type { PaymentService } from '../payments.ts';
import { PaystackError, type Paystack } from '../paystack.ts';
import { venuePaystack } from '../venues/venuePaystack.ts';
import type { MediaStorage } from '../media/storage.ts';
import type { ClerkAdmin } from '../owner/clerkAdmin.ts';
import { TEST_KEY } from './testHelpers.ts';

/**
 * A whole app for owner and staff tests: the sample venues, an owner (Ama, at all three), a waiter
 * and a cook at Mama's Kitchen, a fake Clerk and a fake Paystack. `tick` moves the clock on.
 */
export const NOW = Date.parse('2026-11-16T12:00:00Z');
export const OWNER = '+233200000001';
export const WAITER = '+233200000002';
export const KITCHEN = '+233200000003';

// Stands in for Clerk: "clerk:<user id>:<verified phone or email>" signs that person in.
export const fakeClerk: VerifyOwner = async (token) => {
  const [kind, clerkUserId, address = ''] = token.split(':');
  if (kind !== 'clerk' || !clerkUserId) return null;
  const email = address.includes('@') ? address : null;
  return { clerkUserId, email, phone: email ? null : address || null, firstName: null };
};
export const as = (clerkUserId: string, phone = '') => ({ Authorization: `Bearer clerk:${clerkUserId}:${phone}` });

export async function ownerSetup(options: { verify?: VerifyOwner | null } = {}) {
  let clock = NOW;
  const db = await testDb();
  const { venueIds } = await seedSamples(db);
  await seedOwner(db, { phone: '020 000 0001', email: 'Ama@Example.com', firstName: 'Ama', venueIds });
  const mamas = venueIds.find((id) => id.includes('mama')) ?? venueIds[0]!;
  // A waiter and a cook at Mama's Kitchen only.
  for (const [id, phone, role] of [
    ['usr_waiter', WAITER, 'waiter'],
    ['usr_kitchen', KITCHEN, 'kitchen'],
  ] as const) {
    await db.insert(staffUsers).values({ id, phone, firstName: role });
    await db.insert(staffMemberships).values({ id: `mem_${id}`, venueId: mamas, userId: id, role, status: 'invited' });
  }
  // Paystack accepts only the key "sk_test_goodkey12345".
  const client = (secret: string): Paystack => ({
    chargeMomo: async () => ({ status: 'pay_offline', reference: 'x' }),
    initializeCard: async () => ({ authorization_url: 'https://checkout.paystack.com/x', reference: 'x' }),
    verify: async () => ({ status: 'ongoing', amount: 0, currency: 'GHS' }),
    checkKey: async () => {
      if (secret !== 'sk_test_goodkey12345') throw new PaystackError('Invalid key', 401);
    },
  });
  // Storage: a file "arrives" once the test calls `upload(uploadUrl)`; it then measures 800×600.
  const arrived = new Set<string>();
  const storage: MediaStorage = {
    signUpload: async (path) => `https://storage.test/upload/${path}?token=t`,
    publicUrl: (path) => `https://storage.test/public/${path}`,
    measure: async (path) => (arrived.has(path) ? { width: 800, height: 600 } : null),
  };
  const upload = (uploadUrl: string) => arrived.add(new URL(uploadUrl).pathname.replace('/upload/', ''));
  // Clerk's admin side: remembers the users it made and the sign-outs it was asked for.
  const clerkCalls: string[] = [];
  const clerkAdmin: ClerkAdmin = {
    ensureUser: async ({ email }) => {
      clerkCalls.push(`user ${email}`);
      return `user_clerk_${email.split('@')[0]}`;
    },
    revokeSessions: async (id) => void clerkCalls.push(`sign out ${id}`),
  };
  const logs: Record<string, unknown>[] = [];
  const app = createApp({
    guest: { db, guestSecret: 'test-guest-secret-that-is-long-enough', now: () => clock, loyaltyKey: TEST_KEY },
    owner: {
      db,
      verify: options.verify === undefined ? fakeClerk : options.verify,
      now: () => clock,
      venueKeys: venuePaystack({ db, key: TEST_KEY, client }),
      paystackClient: client,
      storage,
      siteUrl: 'https://cravins-app.vercel.app',
      clerkAdmin,
    },
    payments: {} as PaymentService,
    allowedOrigins: [],
    log: (event) => logs.push(event),
    ping: async () => undefined,
  });
  const call = async (method: string, path: string, body?: unknown, headers: Record<string, string> = {}) => {
    const res = await app.request(`/v1${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const text = await res.text();
    // Most replies are JSON; a QR code is SVG text, kept in `text`.
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return { status: res.status, json, text, type: res.headers.get('Content-Type') ?? '' };
  };
  return { db, call, logs, mamas, upload, clerkCalls, tick: (ms: number) => (clock += ms) };
}
