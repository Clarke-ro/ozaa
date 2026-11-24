import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { expectContract } from '../contract/contract.ts';
import { as, OWNER, ownerSetup } from './ownerTestSetup.ts';

const owner = as('user_owner', OWNER);
const spice = {
  name: { en: 'Spice level' },
  min: 1,
  max: 1,
  options: [
    { name: { en: 'Mild' }, pricePesewas: 0 },
    { name: { en: 'Extra hot' }, pricePesewas: 200 },
  ],
};

async function setUp() {
  const world = await ownerSetup();
  const { call, mamas } = world;
  const menu = (await call('GET', '/venues/mamas-kitchen/menu')).json;
  const dish = menu.items.find(
    (i: { available: boolean; hidden?: boolean }) => i.available && !i.hidden,
  );
  const guest = async () => {
    const token = (
      await call('POST', '/guest-sessions', { venueSlug: 'mamas-kitchen', tableCode: '3' })
    ).json.guestToken;
    return { Authorization: `Bearer ${token}` };
  };
  return {
    ...world,
    dish,
    guest,
    groups: `/owner/venues/${mamas}/menu/modifier-groups`,
    items: `/owner/venues/${mamas}/menu/items`,
  };
}

test('library: a group shows on every dish that lists it, in front of its own, and is charged', async () => {
  const { call, dish, guest, groups, items } = await setUp();
  const made = await call('POST', groups, spice, owner);
  expectContract('ownerCreateModifierGroup', 201, made.json);
  const group = made.json;
  assert.ok(group.options.every((o: { id: string }) => o.id.startsWith('mo_')));

  const saved = await call('PATCH', `${items}/${dish.id}`, { modifierGroupIds: [group.id] }, owner);
  expectContract('ownerUpdateItem', 200, saved.json);
  assert.deepEqual(
    saved.json.modifierGroups.map((g: { id: string }) => g.id),
    [group.id, ...dish.modifierGroups.map((g: { id: string }) => g.id)],
  );

  const menu = (await call('GET', '/venues/mamas-kitchen/menu')).json;
  expectContract('getMenu', 200, menu);
  assert.deepEqual(
    menu.modifierGroups.map((g: { id: string }) => g.id),
    [group.id],
  );

  // Sending back what was read must not copy the library group into the dish.
  const again = await call(
    'PATCH',
    `${items}/${dish.id}`,
    { modifierGroups: saved.json.modifierGroups },
    owner,
  );
  assert.equal(
    again.json.modifierGroups.filter((g: { id: string }) => g.id === group.id).length,
    1,
  );

  const hot = group.options[1].id;
  const order = await call(
    'POST',
    '/orders',
    {
      clientOrderId: randomUUID(),
      lines: [{ menuItemId: dish.id, quantity: 1, modifierOptionIds: [hot] }],
    },
    await guest(),
  );
  assert.equal(order.status, 201);
  assert.deepEqual(order.json.lines[0].modifiers, [{ name: 'Extra hot', pricePesewas: 200 }]);
  assert.equal(order.json.lines[0].totalPesewas, order.json.lines[0].unitPricePesewas + 200);
});

test('library: editing changes every dish; deleting takes it off every dish', async () => {
  const { call, dish, groups, items } = await setUp();
  const group = (await call('POST', groups, spice, owner)).json;
  await call('PATCH', `${items}/${dish.id}`, { modifierGroupIds: [group.id] }, owner);

  const renamed = await call(
    'PUT',
    `${groups}/${group.id}`,
    { ...spice, name: { en: 'Heat' }, options: group.options },
    owner,
  );
  expectContract('ownerUpdateModifierGroup', 200, renamed.json);
  assert.deepEqual(
    renamed.json.options.map((o: { id: string }) => o.id),
    group.options.map((o: { id: string }) => o.id),
  );
  const read = async () =>
    (await call('GET', '/venues/mamas-kitchen/menu')).json.items.find(
      (i: { id: string }) => i.id === dish.id,
    );
  assert.equal((await read()).modifierGroups[0].name.en, 'Heat');

  const removed = await call('DELETE', `${groups}/${group.id}`, undefined, owner);
  assert.equal(removed.status, 204);
  expectContract('ownerDeleteModifierGroup', 204, removed.json);
  const after = await read();
  assert.deepEqual(after.modifierGroupIds, []);
  assert.equal(
    after.modifierGroups.some((g: { id: string }) => g.id === group.id),
    false,
  );
  assert.equal((await call('PUT', `${groups}/${group.id}`, spice, owner)).status, 404);
});

test('library: bad groups and unknown ids are refused', async () => {
  const { call, dish, groups, items } = await setUp();
  assert.equal((await call('POST', groups, { ...spice, options: [] }, owner)).status, 400);
  assert.equal((await call('POST', groups, { ...spice, min: 3 }, owner)).status, 400);
  const negative = { ...spice, options: [{ name: { en: 'Refund' }, pricePesewas: -100 }] };
  assert.equal((await call('POST', groups, negative, owner)).status, 400);
  const unknown = await call(
    'PATCH',
    `${items}/${dish.id}`,
    { modifierGroupIds: ['mg_nope'] },
    owner,
  );
  assert.equal(unknown.status, 422);
});

test('snooze: sold out until the time, then on sale again by itself', async () => {
  const { call, dish, guest, items, tick } = await setUp();
  // The test clock is 2026-11-16 12:00 UTC.
  const saved = await call(
    'PATCH',
    `${items}/${dish.id}`,
    { snoozedUntil: '2026-11-16T17:00:00Z' },
    owner,
  );
  assert.equal(saved.json.snoozedUntil, '2026-11-16T17:00:00.000Z');
  const line = () => ({
    clientOrderId: randomUUID(),
    lines: [{ menuItemId: dish.id, quantity: 1 }],
  });
  assert.equal((await call('POST', '/orders', line(), await guest())).json.code, 'item_sold_out');

  tick(6 * 60 * 60 * 1000);
  assert.equal((await call('POST', '/orders', line(), await guest())).status, 201);

  const cleared = await call('PATCH', `${items}/${dish.id}`, { snoozedUntil: null }, owner);
  assert.equal(cleared.json.snoozedUntil, null);
});
