import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { expectContract } from '../contract/contract.ts';
import { as, KITCHEN, OWNER, ownerSetup, WAITER } from './ownerTestSetup.ts';

const owner = as('user_owner', OWNER);
const tenOff = { name: 'Ten off', kind: 'percent_off', percent: 10, channel: 'all', enabled: true, code: 'jollof10' };

test('promos: owners add one with a code, staff read it, checks name the field to fix', async () => {
  const { call, mamas } = await ownerSetup();
  const base = `/owner/venues/${mamas}/promos`;
  assert.equal((await call('POST', base, tenOff, as('user_waiter', WAITER))).status, 403);
  const made = await call('POST', base, tenOff, owner);
  expectContract('ownerCreatePromo', 201, made.json);
  assert.equal(made.json.code, 'JOLLOF10');
  assert.equal(made.json.state, 'running');
  const list = await call('GET', base, undefined, as('user_kitchen', KITCHEN));
  expectContract('ownerListPromos', 200, list.json);
  assert.equal(list.json.items.length, 1);

  assert.equal((await call('POST', base, { ...tenOff, name: 'Copy' }, owner)).json.code, 'promo_code_taken');
  assert.equal((await call('POST', base, { ...tenOff, code: null, percent: null }, owner)).json.code, 'promo_percent_missing');
  assert.equal((await call('POST', base, { ...tenOff, code: null, kind: 'free_item', freeItemId: 'itm_nope' }, owner)).json.code, 'promo_item_missing');
  assert.equal((await call('POST', base, { ...tenOff, code: null, startTime: '12:00' }, owner)).json.code, 'promo_hours');
  assert.equal((await call('POST', base, { ...tenOff, code: null, startsAt: '2026-12-02T00:00:00Z', endsAt: '2026-12-01T00:00:00Z' }, owner)).json.code, 'promo_dates');
});

test('a coupon code takes money off the order, counts its use, then ends at its limit; off and delete stop it', async () => {
  const { call, mamas } = await ownerSetup();
  const promo = (await call('POST', `/owner/venues/${mamas}/promos`, { ...tenOff, usageLimit: 1 }, owner)).json;
  const guest = { Authorization: `Bearer ${(await call('POST', '/guest-sessions', { venueSlug: 'mamas-kitchen', tableCode: '1' })).json.guestToken}` };
  const dish = (await call('GET', '/venues/mamas-kitchen/menu')).json.items[0];
  const order = (promoCode?: string) => call('POST', '/orders', { clientOrderId: randomUUID(), lines: [{ menuItemId: dish.id, quantity: 2 }], ...(promoCode ? { promoCode } : {}) }, guest);

  const first = (await order('JOLLOF10')).json;
  assert.equal(first.promoDiscounts[0].promoId, promo.id);
  assert.equal(first.totalPesewas, dish.pricePesewas * 2 - first.promoDiscounts[0].pesewas);
  const after = (await call('GET', `/owner/venues/${mamas}/promos`, undefined, owner)).json.items[0];
  assert.equal(after.usageCount, 1);
  assert.equal(after.discountGivenPesewas, first.promoDiscounts[0].pesewas);
  assert.equal(after.state, 'ended');
  assert.equal((await order('JOLLOF10')).json.code, 'promo_not_valid');

  const off = await call('PATCH', `/owner/venues/${mamas}/promos/${promo.id}`, { enabled: false, usageLimit: null }, owner);
  expectContract('ownerUpdatePromo', 200, off.json);
  assert.equal(off.json.state, 'off');
  const removed = await call('DELETE', `/owner/venues/${mamas}/promos/${promo.id}`, undefined, owner);
  assert.equal(removed.status, 204);
  expectContract('ownerDeletePromo', 204, removed.json);
  assert.equal((await call('GET', `/owner/venues/${mamas}/promos`, undefined, owner)).json.items.length, 0);
  // Its old order keeps the discount.
  assert.equal((await call('GET', `/orders/${first.id}`, undefined, guest)).json.promoDiscounts.length, 1);
});
