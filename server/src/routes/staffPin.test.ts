import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { expectContract } from '../contract/contract.ts';
import { staffMemberships, staffUsers } from '../db/schema.ts';
import { as, OWNER, ownerSetup, WAITER } from './ownerTestSetup.ts';

const waiter = as('user_waiter', WAITER);
const DEVICE = 'dev_counter_tablet';

/** The waiter has signed in once by code and set a PIN on the counter tablet. */
async function withPin() {
  const world = await ownerSetup();
  await world.call('GET', '/me', undefined, waiter);
  const set = await world.call('PUT', '/auth/pin', { pin: '4821', deviceId: DEVICE }, waiter);
  assert.equal(set.status, 204);
  const login = (pin: string, deviceId = DEVICE, phone = WAITER, ip = '1.1.1.1') =>
    world.call('POST', '/auth/pin/login', { phone, pin, deviceId }, { 'x-forwarded-for': ip });
  const hasPin = async () =>
    (
      await world.call(
        'GET',
        `/owner/venues/${world.mamas}/staff`,
        undefined,
        as('user_owner', OWNER),
      )
    ).json.items.find((m: { id: string }) => m.id === 'mem_usr_waiter').hasPin as boolean;
  return { ...world, login, hasPin };
}

test('the right PIN on the right device gives a one-time Clerk sign-in token', async () => {
  const { login, clerkCalls, hasPin, logs } = await withPin();
  assert.equal(await hasPin(), true);
  const ok = await login('4821');
  assert.equal(ok.status, 200);
  expectContract('loginWithPin', 200, ok.json);
  assert.equal(ok.json.signInToken, 'sit_user_waiter');
  assert.ok(clerkCalls.includes('sign-in token user_waiter'));
  // Neither the PIN, the phone nor the token is ever logged.
  const logged = JSON.stringify(logs);
  for (const secret of ['4821', '200000002', 'sit_user_waiter'])
    assert.ok(!logged.includes(secret));
});

test('five wrong PINs in a row clear it; the person signs in by code and sets a new one', async () => {
  const { login, hasPin } = await withPin();
  for (let i = 0; i < 4; i += 1) assert.equal((await login('0000')).status, 401);
  // A right PIN before the fifth miss resets the count.
  assert.equal((await login('4821')).status, 200);
  for (let i = 0; i < 5; i += 1) assert.equal((await login('0000')).status, 401);
  assert.equal(await hasPin(), false);
  assert.equal((await login('4821')).status, 401, 'the old PIN no longer works');
});

test('guesses sent all at once still get only five tries', async () => {
  const { login, hasPin } = await withPin();
  const answers = await Promise.all(Array.from({ length: 12 }, () => login('0000')));
  assert.ok(answers.every((a) => a.status === 401));
  assert.equal(await hasPin(), false);
});

test('a wrong device never works and never counts, so nobody can lock a person out', async () => {
  const { login } = await withPin();
  for (let i = 0; i < 8; i += 1)
    assert.equal((await login('4821', 'dev_someone_else')).status, 401);
  assert.equal((await login('4821')).status, 200);
});

test('every refusal looks the same, so the PIN screen never says which numbers are staff', async () => {
  const { db, login, call } = await withPin();
  const refusals = [
    await login('4821', DEVICE, '+233249999999'), // nobody
    await login('0000'), // wrong PIN
    await login('4821', 'dev_other'), // wrong device
  ];
  // Someone removed from every team can't use their old PIN either.
  await db
    .update(staffMemberships)
    .set({ status: 'removed' })
    .where(eq(staffMemberships.userId, 'usr_waiter'));
  refusals.push(await login('4821'));
  for (const r of refusals) {
    assert.equal(r.status, 401);
    expectContract('loginWithPin', 401, r.json);
    assert.deepEqual(r.json, refusals[0]!.json);
  }
  // A person who has never signed in by code has no Clerk sign-in to hand back.
  await db.update(staffUsers).set({ clerkUserId: null }).where(eq(staffUsers.id, 'usr_kitchen'));
  assert.equal(
    (
      await call('POST', '/auth/pin/login', {
        phone: '+233200000003',
        pin: '4821',
        deviceId: DEVICE,
      })
    ).status,
    401,
  );
});

test('setting a PIN needs a sign-in and exactly four digits', async () => {
  const { call } = await ownerSetup();
  assert.equal((await call('PUT', '/auth/pin', { pin: '4821', deviceId: DEVICE })).status, 401);
  await call('GET', '/me', undefined, waiter);
  for (const pin of ['482', '48211', '48a1']) {
    assert.equal((await call('PUT', '/auth/pin', { pin, deviceId: DEVICE }, waiter)).status, 400);
  }
  const ok = await call('PUT', '/auth/pin', { pin: '4821', deviceId: DEVICE }, waiter);
  expectContract('setStaffPin', 204, ok.json);
});

test("the owner's reset clears the PIN", async () => {
  const { call, login, mamas } = await withPin();
  await call(
    'POST',
    `/owner/venues/${mamas}/staff/mem_usr_waiter/reset-pin`,
    undefined,
    as('user_owner', OWNER),
  );
  assert.equal((await login('4821')).status, 401);
});

test('one address trying many numbers is slowed down', async () => {
  const { login } = await withPin();
  let limited = false;
  for (let i = 0; i < 40 && !limited; i += 1) {
    limited =
      (await login('0000', DEVICE, `+2332400000${String(i).padStart(2, '0')}`, '6.6.6.6'))
        .status === 429;
  }
  assert.ok(limited);
  // Another address is unaffected.
  assert.equal((await login('4821', DEVICE, WAITER, '7.7.7.7')).status, 200);
});
