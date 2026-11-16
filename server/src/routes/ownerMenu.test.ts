import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { expectContract } from '../contract/contract.ts';
import { as, KITCHEN, OWNER, ownerSetup } from './ownerTestSetup.ts';

const owner = as('user_owner', OWNER);

test('sections: list, add at the end, rename, and delete only when empty', async () => {
  const { call, mamas } = await ownerSetup();
  const base = `/owner/venues/${mamas}/menu/categories`;
  const list = await call('GET', base, undefined, owner);
  expectContract('ownerListCategories', 200, list.json);
  assert.equal((await call('GET', base, undefined, as('user_kitchen', KITCHEN))).status, 403);

  const made = await call('POST', base, { name: { en: 'Desserts' }, kind: 'food' }, owner);
  expectContract('ownerCreateCategory', 201, made.json);
  assert.equal(made.json.position, list.json.items.length);
  const renamed = await call('PATCH', `${base}/${made.json.id}`, { name: { en: 'Sweets' }, kind: 'food', hidden: true }, owner);
  expectContract('ownerUpdateCategory', 200, renamed.json);
  assert.equal(renamed.json.hidden, true);

  const full = list.json.items[0].id;
  const refused = await call('DELETE', `${base}/${full}`, undefined, owner);
  expectContract('ownerDeleteCategory', 409, refused.json);
  assert.equal((await call('DELETE', `${base}/${made.json.id}`, undefined, owner)).status, 204);
});

test('dishes: add, edit price and stock, sell out, hide and delete; guests see the changes', async () => {
  const { call, mamas } = await ownerSetup();
  const sections = (await call('GET', `/owner/venues/${mamas}/menu/categories`, undefined, owner)).json.items;
  const base = `/owner/venues/${mamas}/menu/items`;
  assert.equal((await call('POST', base, { name: { en: 'Kelewele' } }, owner)).status, 400);
  assert.equal((await call('POST', base, { name: { en: 'X' }, pricePesewas: 100, categoryId: 'cat_elsewhere' }, owner)).status, 422);

  const made = await call('POST', base, { categoryId: sections[0].id, name: { en: 'Kelewele' }, pricePesewas: 1500, badges: ['new'] }, owner);
  expectContract('ownerCreateItem', 201, made.json);
  const id = made.json.id;
  const guestMenu = async () => (await call('GET', '/venues/mamas-kitchen/menu')).json.items.find((i: { id: string }) => i.id === id);
  assert.equal((await guestMenu()).pricePesewas, 1500);

  const sale = await call('PATCH', `${base}/${id}`, { salePricePesewas: 1200, stockCount: 3 }, owner);
  expectContract('ownerUpdateItem', 200, sale.json);
  assert.equal(sale.json.salePricePesewas, 1200);
  assert.equal(sale.json.badges[0], 'new');
  const badSale = await call('PATCH', `${base}/${id}`, { salePricePesewas: 1500 }, owner);
  assert.equal(badSale.status, 422);

  // Stock 0 sells it out; guests then can't order it.
  assert.equal((await call('PATCH', `${base}/${id}`, { stockCount: 0 }, owner)).json.available, false);
  const token = (await call('POST', '/guest-sessions', { venueSlug: 'mamas-kitchen', tableCode: '3' })).json.guestToken;
  const order = await call('POST', '/orders', { clientOrderId: randomUUID(), lines: [{ menuItemId: id, quantity: 1 }] }, { Authorization: `Bearer ${token}` });
  assert.equal(order.json.code, 'item_sold_out');

  assert.equal((await call('DELETE', `${base}/${id}`, undefined, owner)).status, 204);
  assert.equal(await guestMenu(), undefined);
  assert.equal((await call('PATCH', `${base}/${id}`, { pricePesewas: 1 }, owner)).status, 404);
});
