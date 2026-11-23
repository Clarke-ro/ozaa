import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { menuCategories, menuItems, staffMemberships, staffUsers } from '../db/schema.ts';
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

test('add-on prices are whole pesewas and cannot be negative', async () => {
  const { call, mamas } = await ownerSetup();
  const section = (await call('GET', `/owner/venues/${mamas}/menu/categories`, undefined, owner)).json.items[0];
  const group = {
    id: 'mod_spice',
    name: { en: 'Spice' },
    min: 0,
    max: 1,
    options: [{ id: 'opt_mild', name: { en: 'Mild' }, pricePesewas: 0 }],
  };
  const made = await call('POST', `/owner/venues/${mamas}/menu/items`, { categoryId: section.id, name: { en: 'Kelewele' }, pricePesewas: 1500, modifierGroups: [group] }, owner);
  assert.equal(made.status, 201);
  assert.equal(made.json.modifierGroups[0].options[0].pricePesewas, 0);
  const bad = await call(
    'PATCH',
    `/owner/venues/${mamas}/menu/items/${made.json.id}`,
    { modifierGroups: [{ ...group, options: [{ id: 'opt_hot', name: { en: 'Hot' }, pricePesewas: -50 }] }] },
    owner,
  );
  assert.equal(bad.status, 400);
  const saved = (await call('GET', '/venues/mamas-kitchen/menu')).json.items.find((item: { id: string }) => item.id === made.json.id);
  assert.equal(saved.modifierGroups[0].options[0].pricePesewas, 0);
});

test("a manager cannot delete or reveal another venue's section", async () => {
  const { call, db, mamas } = await ownerSetup();
  await db.insert(staffUsers).values({ id: 'usr_manager', phone: '+233200000004', firstName: 'Kojo', clerkUserId: 'user_manager' });
  await db.insert(staffMemberships).values({ id: 'mem_usr_manager', venueId: mamas, userId: 'usr_manager', role: 'manager', status: 'active' });
  const manager = as('user_manager', '+233200000004');
  const beanMenu = (await call('GET', '/venues/bean-there/menu')).json;
  const bean = beanMenu.venueId as string;
  const foreignId = beanMenu.categories.find((section: { id: string }) => beanMenu.items.some((item: { categoryId: string }) => item.categoryId === section.id)).id as string;
  const before = await db.select().from(menuItems).where(eq(menuItems.categoryId, foreignId));

  // A live section elsewhere used to answer 409, which told the caller it had dishes.
  const live = await call('DELETE', `/owner/venues/${mamas}/menu/categories/${foreignId}`, undefined, manager);
  assert.equal(live.status, 204);
  assert.equal(live.json, null);
  const [section] = await db.select().from(menuCategories).where(eq(menuCategories.id, foreignId));
  assert.equal(section?.venueId, bean);
  const after = await db.select().from(menuItems).where(eq(menuItems.categoryId, foreignId));
  assert.equal(after.length, before.length);

  // An empty section elsewhere, including dishes already taken off the menu, stays put.
  const made = await call('POST', `/owner/venues/${bean}/menu/categories`, { name: { en: 'Specials' }, kind: 'food' }, owner);
  const dish = await call('POST', `/owner/venues/${bean}/menu/items`, { categoryId: made.json.id, name: { en: 'Gone' }, pricePesewas: 100 }, owner);
  assert.equal((await call('DELETE', `/owner/venues/${bean}/menu/items/${dish.json.id}`, undefined, owner)).status, 204);
  const attack = await call('DELETE', `/owner/venues/${mamas}/menu/categories/${made.json.id}`, undefined, manager);
  assert.equal(attack.status, 204);
  const [keptSection] = await db.select().from(menuCategories).where(eq(menuCategories.id, made.json.id));
  const [keptDish] = await db.select().from(menuItems).where(eq(menuItems.id, dish.json.id));
  assert.equal(keptSection?.venueId, bean);
  assert.ok(keptDish?.deletedAt);

  // Their own empty section still deletes, and another venue's dish does not.
  const own = await call('POST', `/owner/venues/${mamas}/menu/categories`, { name: { en: 'Tonight' }, kind: 'food' }, manager);
  assert.equal((await call('DELETE', `/owner/venues/${mamas}/menu/categories/${own.json.id}`, undefined, manager)).status, 204);
  const [gone] = await db.select().from(menuCategories).where(eq(menuCategories.id, own.json.id));
  assert.equal(gone, undefined);
  const otherDish = beanMenu.items[0];
  const deleted = await call('DELETE', `/owner/venues/${mamas}/menu/items/${otherDish.id}`, undefined, manager);
  assert.equal(deleted.status, 204);
  expectContract('ownerDeleteItem', 204, deleted.json);
  assert.equal((await call('PATCH', `/owner/venues/${mamas}/menu/items/${otherDish.id}`, { pricePesewas: 1 }, manager)).status, 404);
  const still = (await call('GET', '/venues/bean-there/menu')).json.items.find((item: { id: string }) => item.id === otherDish.id);
  assert.equal(still.pricePesewas, otherDish.pricePesewas);
});
