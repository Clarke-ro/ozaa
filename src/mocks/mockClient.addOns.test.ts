import { ApiError } from '@/lib/api/errors';
import { signedInMock } from './testOwner';

const spice = {
  name: { en: 'Spice level' },
  min: 1,
  max: 1,
  options: [
    { name: { en: 'Mild' }, pricePesewas: 0 },
    { name: { en: 'Extra hot' }, pricePesewas: 200 },
  ],
};

async function codeOf(promise: Promise<unknown>) {
  try {
    await promise;
    return 'ok';
  } catch (error) {
    return error instanceof ApiError ? error.code : String(error);
  }
}

async function setUp() {
  const at = Date.parse('2026-11-24T12:00:00.000Z');
  const mock = await signedInMock(at);
  const venue = await mock.api.getVenue('mamas-kitchen');
  const menu = await mock.api.getMenu('mamas-kitchen');
  const dish = menu.items.find((item) => item.available && !item.hidden)!;
  return { ...mock, at, venueId: venue.id, dish };
}

test('a library group shows on every dish that lists it, in front of its own', async () => {
  const { api, venueId, dish } = await setUp();
  const group = await api.ownerCreateModifierGroup(venueId, spice);
  expect(group.options.every((option) => option.id)).toBe(true);
  const saved = await api.ownerUpdateItem(venueId, dish.id, { modifierGroupIds: [group.id] });
  expect(saved.modifierGroups[0]!.id).toBe(group.id);

  const menu = await api.getMenu('mamas-kitchen');
  expect(menu.modifierGroups?.map((g) => g.id)).toEqual([group.id]);
  const read = menu.items.find((item) => item.id === dish.id)!;
  expect(read.modifierGroups.map((g) => g.id)).toEqual([
    group.id,
    ...dish.modifierGroups.map((g) => g.id),
  ]);
});

test('sending back what was read never copies the library group into the dish', async () => {
  const { api, venueId, dish } = await setUp();
  const group = await api.ownerCreateModifierGroup(venueId, spice);
  const read = await api.ownerUpdateItem(venueId, dish.id, { modifierGroupIds: [group.id] });
  const again = await api.ownerUpdateItem(venueId, dish.id, {
    modifierGroups: read.modifierGroups,
  });
  expect(again.modifierGroups.filter((g) => g.id === group.id)).toHaveLength(1);
});

test('editing the library changes the dish; deleting takes it off', async () => {
  const { api, venueId, dish } = await setUp();
  const group = await api.ownerCreateModifierGroup(venueId, spice);
  await api.ownerUpdateItem(venueId, dish.id, { modifierGroupIds: [group.id] });
  await api.ownerUpdateModifierGroup(venueId, group.id, { ...spice, name: { en: 'Heat' } });
  const renamed = (await api.getMenu('mamas-kitchen')).items.find((i) => i.id === dish.id)!;
  expect(renamed.modifierGroups[0]!.name.en).toBe('Heat');

  await api.ownerDeleteModifierGroup(venueId, group.id);
  const after = (await api.getMenu('mamas-kitchen')).items.find((i) => i.id === dish.id)!;
  expect(after.modifierGroupIds).toEqual([]);
  expect(after.modifierGroups.some((g) => g.id === group.id)).toBe(false);
});

test('a dish may only list groups in the library; bad groups are refused', async () => {
  const { api, venueId, dish } = await setUp();
  expect(await codeOf(api.ownerUpdateItem(venueId, dish.id, { modifierGroupIds: ['mg_x'] }))).toBe(
    'validation',
  );
  expect(await codeOf(api.ownerCreateModifierGroup(venueId, { ...spice, options: [] }))).toBe(
    'validation',
  );
});

test('a library add-on is charged on the order', async () => {
  const { api, venueId, dish, setGuest } = await setUp();
  const group = await api.ownerCreateModifierGroup(venueId, spice);
  await api.ownerUpdateItem(venueId, dish.id, { modifierGroupIds: [group.id] });
  const session = await api.createGuestSession({ venueSlug: 'mamas-kitchen', tableCode: '12' });
  setGuest(session.guestToken);
  const hot = group.options[1]!.id;
  const order = await api.createOrder(
    {
      clientOrderId: 'c1',
      lines: [{ menuItemId: dish.id, quantity: 1, modifierOptionIds: [hot] }],
    },
    { idempotencyKey: 'k1' },
  );
  const line = order.lines[0]!;
  expect(line.modifiers).toEqual([{ name: 'Extra hot', pricePesewas: 200 }]);
  expect(line.totalPesewas).toBe(line.unitPricePesewas + 200);
});

test('a snoozed dish is sold out until the time, for orders too', async () => {
  const { api, venueId, dish, setGuest } = await setUp();
  await api.ownerUpdateItem(venueId, dish.id, { snoozedUntil: '2026-11-24T17:00:00.000Z' });
  const session = await api.createGuestSession({ venueSlug: 'mamas-kitchen', tableCode: '12' });
  setGuest(session.guestToken);
  const order = api.createOrder(
    { clientOrderId: 'c2', lines: [{ menuItemId: dish.id, quantity: 1 }] },
    { idempotencyKey: 'k2' },
  );
  expect(await codeOf(order)).toBe('item_sold_out');
});
