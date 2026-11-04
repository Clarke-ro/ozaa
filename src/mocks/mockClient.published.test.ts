import { ownerApi, signedInMock } from './testOwner';

test('an unpublished venue refuses orders, and publishing opens it again', async () => {
  const api = await ownerApi();
  const venue = await api.getVenue('mamas-kitchen');
  expect(venue.published).not.toBe(false);
  await api.ownerUpdateVenue(venue.id, { published: false });
  expect((await api.getVenue('mamas-kitchen')).published).toBe(false);
  // The owner's own screens can still read the menu while it's closed.
  expect((await api.getMenu('mamas-kitchen')).items.length).toBeGreaterThan(0);
  await api.ownerUpdateVenue(venue.id, { published: true });
  expect((await api.getVenue('mamas-kitchen')).published).toBe(true);
});

test('ordering from an unpublished venue fails with venue_not_published', async () => {
  const { api, setGuest } = await signedInMock();
  const { id } = await api.getVenue('mamas-kitchen');
  setGuest(
    (await api.createGuestSession({ venueSlug: 'mamas-kitchen', tableCode: '4' })).guestToken,
  );
  await api.ownerUpdateVenue(id, { published: false });
  const dish = (await api.getMenu('mamas-kitchen')).items[0]!;
  const order = api.createOrder(
    { clientOrderId: crypto.randomUUID(), lines: [{ menuItemId: dish.id, quantity: 1 }] },
    { idempotencyKey: crypto.randomUUID() },
  );
  await expect(order).rejects.toMatchObject({ code: 'venue_not_published' });
});

test('a new dish goes to the end of its section', async () => {
  const api = await ownerApi();
  const { id } = await api.getVenue('mamas-kitchen');
  const menu = await api.getMenu('mamas-kitchen');
  const section = menu.categories[0]!.id;
  const count = menu.items.filter((item) => item.categoryId === section).length;
  const dish = await api.ownerCreateItem(id, {
    categoryId: section,
    name: { en: 'Fufu' },
    pricePesewas: 5000 as never,
  });
  expect(dish.position).toBe(count);
});
