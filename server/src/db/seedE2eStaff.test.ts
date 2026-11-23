import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { loyaltyMembers, paymentSettings, staffMemberships, staffUsers, venues } from './schema.ts';
import {
  E2E_STAFF,
  e2eEmail,
  isLocalDatabase,
  seedE2eLoyalty,
  seedE2ePaystack,
  seedE2eStaff,
} from './seedE2eStaff.ts';
import { TEST_KEY } from '../routes/testHelpers.ts';
import { seedSamples } from './seedSamples.ts';
import { testDb } from './testDb.ts';

test('only a database on this machine can get the test staff', () => {
  assert.equal(isLocalDatabase('postgres://postgres:postgres@127.0.0.1:5432/postgres'), true);
  assert.equal(isLocalDatabase('postgres://postgres@localhost/cravins'), true);
  assert.equal(
    isLocalDatabase('postgresql://u:p@aws-0-eu-west-1.pooler.supabase.com:5432/postgres'),
    false,
  );
});

test('the demo staff become real staff with Clerk test emails, once, however often it runs', async () => {
  const db = await testDb();
  await seedSamples(db);
  const made: string[] = [];
  const clerk = { ensureUser: async ({ email }: { email: string }) => void made.push(email) };
  await seedE2eStaff(db, clerk);
  await seedE2eStaff(db, clerk);
  const ama = (
    await db
      .select()
      .from(staffUsers)
      .where(eq(staffUsers.email, e2eEmail('Ama')))
  )[0]!;
  assert.equal(ama.phone, '+233240000001');
  const roles = await db.select().from(staffMemberships).where(eq(staffMemberships.userId, ama.id));
  // The business owner, at all three locations.
  assert.deepEqual(
    roles.map((r) => r.role),
    ['owner', 'owner', 'owner'],
  );
  const people = new Set(E2E_STAFF.map((person) => person.phone)).size;
  assert.equal((await db.select().from(staffUsers)).length, people);
  assert.equal((await db.select().from(staffMemberships)).length, E2E_STAFF.length);
  assert.ok(made.includes('kwesi+clerk_test@example.com'));
});

test('Paystack test keys connect the venues the mock connects, and only those', async () => {
  const db = await testDb();
  await seedSamples(db);
  await seedE2ePaystack(db, TEST_KEY, { publicKey: 'pk_test_public', secretKey: 'sk_test_secret' });
  const rows = await db
    .select({ slug: venues.slug, mode: paymentSettings.paystackMode })
    .from(paymentSettings)
    .innerJoin(venues, eq(venues.id, paymentSettings.venueId));
  const connected = rows
    .filter((row) => row.mode === 'test')
    .map((row) => row.slug)
    .sort();
  assert.deepEqual(connected, ['bean-there', 'mamas-kitchen']);
});

test("Esi joins Mama's Kitchen loyalty, as in the mock, once however often it runs", async () => {
  const db = await testDb();
  await seedSamples(db);
  await seedE2eLoyalty(db);
  await seedE2eLoyalty(db);
  const members = await db.select().from(loyaltyMembers);
  assert.deepEqual(
    members.map((m) => [m.venueId, m.firstName]),
    [['ven_mamas', 'Esi']],
  );
});
