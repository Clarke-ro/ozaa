import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { expectContract } from '../contract/contract.ts';
import { as, KITCHEN, OWNER, ownerSetup, WAITER } from './ownerTestSetup.ts';

const owner = as('user_owner', OWNER);
const waiter = as('user_waiter', WAITER);
const kitchen = as('user_kitchen', KITCHEN);

test('staff take orders: for a table, at the counter, or a pickup with details; the kitchen can\'t', async () => {
  const { call, mamas } = await ownerSetup();
  const dish = (await call('GET', '/venues/mamas-kitchen/menu')).json.items[0];
  const lines = [{ menuItemId: dish.id, quantity: 2 }];
  const base = `/owner/venues/${mamas}/orders`;
  const table = await call('POST', base, { clientOrderId: randomUUID(), tableCode: '5', lines }, waiter);
  expectContract('ownerCreateOrder', 201, table.json);
  assert.equal(table.json.source, 'table');
  const counter = (await call('POST', base, { clientOrderId: randomUUID(), tableCode: null, lines }, waiter)).json;
  assert.equal(counter.source, 'pickup');
  assert.equal(counter.contact, null);
  const pickup = (await call('POST', base, { clientOrderId: randomUUID(), lines, fulfilment: { type: 'pickup', contact: { name: 'Kofi', phone: '+233241112222' } } }, owner)).json;
  assert.equal(pickup.contact.name, 'Kofi');
  assert.equal((await call('POST', base, { clientOrderId: randomUUID(), tableCode: '99', lines }, waiter)).status, 422);
  assert.equal((await call('POST', base, { clientOrderId: randomUUID(), lines }, kitchen)).status, 403);
  // A double tap saves one order.
  const id = randomUUID();
  const once = (await call('POST', base, { clientOrderId: id, lines }, waiter)).json.id;
  assert.equal((await call('POST', base, { clientOrderId: id, lines }, waiter)).json.id, once);
  assert.equal((await call('POST', '/owner/transactions/txn_1/refund', undefined, owner)).status, 404);
});

test('insights for a range: orders, visits and the funnel', async () => {
  const { call, mamas } = await ownerSetup();
  const guest = { Authorization: `Bearer ${(await call('POST', '/guest-sessions', { venueSlug: 'mamas-kitchen', tableCode: '2' })).json.guestToken}` };
  const dish = (await call('GET', '/venues/mamas-kitchen/menu')).json.items[0];
  await call('POST', '/orders', { clientOrderId: randomUUID(), lines: [{ menuItemId: dish.id, quantity: 1 }] }, guest);
  const report = await call('GET', `/owner/venues/${mamas}/insights?range=7d`, undefined, owner);
  expectContract('ownerGetInsights', 200, report.json);
  assert.equal((await call('GET', `/owner/venues/${mamas}/insights?range=custom`, undefined, owner)).status, 400);
  assert.equal((await call('GET', `/owner/venues/${mamas}/insights`, undefined, kitchen)).status, 403);
});

test('the business and its locations: the owner edits; a new location is a new, unpublished venue', async () => {
  const { call } = await ownerSetup();
  const got = await call('GET', '/owner/business', undefined, owner);
  expectContract('ownerGetBusiness', 200, got.json);
  assert.ok(got.json.locations.length >= 1);
  assert.equal((await call('PATCH', '/owner/business', { name: 'X' }, owner)).json.code, 'name_too_short');
  assert.equal((await call('PATCH', '/owner/business', { cuisines: ['Ghanaian'] }, waiter)).status, 403);
  const saved = await call('PATCH', '/owner/business', { description: 'Home cooking', cuisines: ['Ghanaian'], priceRange: 2 }, owner);
  expectContract('ownerUpdateBusiness', 200, saved.json);
  assert.deepEqual(saved.json.cuisines, ['Ghanaian']);

  const made = await call('POST', '/owner/business/locations', { name: "Mama's Kitchen East Legon", country: 'Ghana', city: 'Accra' }, owner);
  expectContract('ownerCreateLocation', 201, made.json);
  assert.equal(made.json.slug, 'mama-s-kitchen-east-legon');
  assert.equal((await call('GET', `/venues/${made.json.slug}`)).json.published, false);
  const me = (await call('GET', '/me', undefined, owner)).json;
  assert.ok(me.venues.some((v: { venueId: string; role: string }) => v.venueId === made.json.id && v.role === 'owner'));
  assert.equal((await call('PATCH', `/owner/business/locations/${made.json.id}`, { digitalAddress: 'nope' }, owner)).json.code, 'digital_address_not_valid');
  const moved = await call('PATCH', `/owner/business/locations/${made.json.id}`, { digitalAddress: 'GA-123-4567', geo: { lat: 5.63, lng: -0.15 } }, owner);
  expectContract('ownerUpdateLocation', 200, moved.json);
  assert.equal((await call('GET', `/venues/${made.json.slug}`)).json.location.lat, 5.63);
});

test('scanner devices: pair with a code, list, revoke', async () => {
  const { call, mamas } = await ownerSetup();
  const paired = await call('POST', `/owner/venues/${mamas}/devices/pair`, { name: 'Door phone' }, owner);
  expectContract('ownerPairScannerDevice', 200, paired.json);
  assert.match(paired.json.pairingCode, /^\d{6}$/);
  const list = await call('GET', `/owner/venues/${mamas}/devices`, undefined, owner);
  expectContract('ownerListScannerDevices', 200, list.json);
  assert.equal(list.json.items.length, 1);
  assert.equal((await call('DELETE', `/owner/venues/${mamas}/devices/${paired.json.id}`, undefined, owner)).status, 204);
  assert.equal((await call('GET', `/owner/venues/${mamas}/devices`, undefined, owner)).json.items.length, 0);
  assert.equal((await call('POST', `/owner/venues/${mamas}/devices/pair`, { name: 'x' }, waiter)).status, 403);
});

test('my profile, and deleting an account: staff can; an owner is sent to support', async () => {
  const { call, clerkCalls } = await ownerSetup();
  const me = await call('PATCH', '/me/profile', { firstName: 'Ama K', prefs: { notify: { review: false } } }, owner);
  expectContract('updateMyProfile', 200, me.json);
  assert.equal(me.json.firstName, 'Ama K');
  assert.equal(me.json.prefs.notify.review, false);
  assert.equal(me.json.prefs.notify.order, true, 'other switches keep their default');
  assert.equal((await call('PATCH', '/me/profile', { email: 'not-an-email' }, owner)).json.code, 'email_not_valid');

  assert.equal((await call('DELETE', '/auth/account', { confirmText: 'nope' }, waiter)).status, 400);
  assert.equal((await call('DELETE', '/auth/account', { confirmText: 'DELETE MY ACCOUNT' }, owner)).json.code, 'owner_has_venues');
  assert.equal((await call('DELETE', '/auth/account', { confirmText: 'DELETE MY ACCOUNT' }, waiter)).status, 204);
  assert.ok(clerkCalls.includes('delete user_waiter'));
  assert.equal((await call('GET', '/me', undefined, waiter)).json.code, 'not_staff');
});
