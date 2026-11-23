import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { staffMemberships, staffUsers } from './schema.ts';
import { E2E_STAFF, e2eEmail, isLocalDatabase, seedE2eStaff } from './seedE2eStaff.ts';
import { seedSamples } from './seedSamples.ts';
import { testDb } from './testDb.ts';

test('only a database on this machine can get the test staff', () => {
  assert.equal(isLocalDatabase('postgres://postgres:postgres@127.0.0.1:5432/postgres'), true);
  assert.equal(isLocalDatabase('postgres://postgres@localhost/cravins'), true);
  assert.equal(isLocalDatabase('postgresql://u:p@aws-0-eu-west-1.pooler.supabase.com:5432/postgres'), false);
});

test('the demo staff become real staff with Clerk test emails, once, however often it runs', async () => {
  const db = await testDb();
  await seedSamples(db);
  const made: string[] = [];
  const clerk = { ensureUser: async ({ email }: { email: string }) => void made.push(email) };
  await seedE2eStaff(db, clerk);
  await seedE2eStaff(db, clerk);
  const ama = (await db.select().from(staffUsers).where(eq(staffUsers.email, e2eEmail('Ama'))))[0]!;
  assert.equal(ama.phone, '+233240000001');
  const roles = await db.select().from(staffMemberships).where(eq(staffMemberships.userId, ama.id));
  assert.deepEqual(roles.map((r) => r.role), ['owner']);
  assert.equal((await db.select().from(staffUsers)).length, E2E_STAFF.length);
  assert.ok(made.includes('kwesi+clerk_test@example.com'));
});
