import { test } from 'node:test';
import assert from 'node:assert/strict';
import { expectContract } from '../contract/contract.ts';
import { as, OWNER, ownerSetup, WAITER } from './ownerTestSetup.ts';

const owner = as('user_owner', OWNER);

test('an invite makes their Clerk sign-in; their first sign-in by email joins them to the team', async () => {
  const { call, mamas, clerkCalls } = await ownerSetup();
  const base = `/owner/venues/${mamas}/staff`;
  const list = await call('GET', base, undefined, owner);
  expectContract('ownerListStaff', 200, list.json);
  assert.ok(list.json.items.some((m: { phoneMasked: string }) => m.phoneMasked === '020 *** 0001'));
  assert.equal((await call('GET', base, undefined, as('user_waiter', WAITER))).status, 403);

  const ask = { phone: '+233249990000', email: 'Esi@Example.com', firstName: 'Esi', role: 'waiter' };
  assert.equal((await call('POST', base, { ...ask, role: 'owner' }, owner)).status, 400);
  const invited = await call('POST', base, ask, owner);
  expectContract('ownerInviteStaff', 201, invited.json);
  assert.equal(invited.json.status, 'invited');
  assert.equal(invited.json.phoneMasked, '024 *** 0000');
  assert.deepEqual(clerkCalls, ['user esi@example.com']);
  assert.equal((await call('POST', base, ask, owner)).json.code, 'already_staff');

  // Esi signs in with the Clerk user the invite made: no phone needed, and she is now active.
  const me = await call('GET', '/me', undefined, as('user_clerk_esi', 'esi@example.com'));
  assert.equal(me.json.firstName, 'Esi');
  assert.deepEqual(me.json.venues.map((v: { role: string }) => v.role), ['waiter']);
  const after = (await call('GET', base, undefined, owner)).json.items.find((m: { id: string }) => m.id === invited.json.id);
  assert.equal(after.status, 'active');

  // Someone else can't be invited with Esi's email.
  const taken = await call('POST', base, { ...ask, phone: '+233249990001' }, owner);
  assert.equal(taken.json.code, 'email_taken');
});

test('role and tables change, a PIN resets, and removing someone signs them out; never the owner', async () => {
  const { call, mamas, clerkCalls } = await ownerSetup();
  const base = `/owner/venues/${mamas}/staff`;
  const esi = (await call('POST', base, { phone: '+233249990000', email: 'esi@example.com', firstName: 'Esi', role: 'waiter' }, owner)).json;
  const items = (await call('GET', base, undefined, owner)).json.items;
  const ownerRow = items.find((m: { role: string }) => m.role === 'owner');

  const moved = await call('PATCH', `${base}/${esi.id}`, { role: 'kitchen', tableCodes: ['1', '2'] }, owner);
  expectContract('ownerUpdateStaff', 200, moved.json);
  assert.equal(moved.json.role, 'kitchen');
  assert.equal((await call('PATCH', `${base}/${ownerRow.id}`, { role: 'manager' }, owner)).json.code, 'owner_role');
  assert.equal((await call('PATCH', `${base}/${esi.id}`, {}, owner)).status, 400);

  assert.equal((await call('POST', `${base}/${esi.id}/reset-pin`, undefined, owner)).status, 204);
  assert.equal((await call('POST', `${base}/${ownerRow.id}/sign-out`, undefined, owner)).json.code, 'owner_sign_out');
  assert.equal((await call('POST', `${base}/${esi.id}/sign-out`, undefined, owner)).status, 204);
  assert.equal(clerkCalls.at(-1), 'sign out user_clerk_esi');

  assert.equal((await call('DELETE', `${base}/${esi.id}`, undefined, owner)).status, 204);
  assert.equal((await call('GET', '/me', undefined, as('user_clerk_esi', 'esi@example.com'))).json.code, 'not_staff');
  assert.equal((await call('PATCH', `${base}/${esi.id}`, { role: 'waiter' }, owner)).status, 404);
  // Invited again later, she comes back.
  const back = await call('POST', base, { phone: '+233249990000', firstName: 'Esi', role: 'viewer' }, owner);
  assert.equal(back.json.id, esi.id);
  assert.equal(back.json.role, 'viewer');
});
