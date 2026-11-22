import { ApiError } from '@/lib/api/errors';
import { signedInMock } from './testOwner';

const settings = {
  enabled: true,
  pickup: { enabled: true, prepMinutes: 25 },
  delivery: {
    enabled: true,
    minimumFeePesewas: 1000,
    feePerKmPesewas: 250,
    maxDistanceKm: 5,
    freeOverPesewas: null,
  },
};
const pin = { lat: 5.556, lng: -0.1822 };
const contact = { name: 'Esi', phone: '+233241234567' };

/** A venue with online ordering on and a map pin, and a guest who came in from the menu link. */
async function linkGuest() {
  const { api, setGuest } = await signedInMock();
  const venue = await api.getVenue('mamas-kitchen');
  await api.ownerUpdateVenue(venue.id, {
    onlineOrdering: settings,
    location: { label: venue.location.label, ...pin },
  });
  setGuest((await api.createGuestSession({ venueSlug: 'mamas-kitchen' })).guestToken);
  const dish = (await api.getMenu('mamas-kitchen')).items[0]!;
  const order = (extra: object) =>
    api.createOrder(
      {
        clientOrderId: crypto.randomUUID(),
        lines: [{ menuItemId: dish.id, quantity: 1 }],
        ...extra,
      },
      { idempotencyKey: crypto.randomUUID() },
    );
  return { api, venue, dish, order };
}

async function codeOf(promise: Promise<unknown>) {
  try {
    await promise;
    return 'ok';
  } catch (error) {
    return error instanceof ApiError ? error.code : String(error);
  }
}

test('a pickup order from the link records the source, the contact and the prep time', async () => {
  const { order, dish } = await linkGuest();
  const placed = await order({ fulfilment: { type: 'pickup', contact } });
  expect(placed.source).toBe('pickup');
  expect(placed.contact).toEqual(contact);
  expect(placed.etaMinutes).toBe(25);
  expect(placed.tableCode).toBeNull();
  expect(placed.totalPesewas).toBe(dish.pricePesewas);
});

test('a delivery order adds the fee to the total', async () => {
  const { order, dish } = await linkGuest();
  const placed = await order({
    fulfilment: {
      type: 'delivery',
      contact,
      address: 'House 4, Oxford St',
      location: { lat: 5.576, lng: -0.1822 },
    },
  });
  expect(placed.source).toBe('delivery');
  expect(placed.deliveryFeePesewas).toBe(1000);
  expect(placed.deliveryAddress).toBe('House 4, Oxford St');
  expect(placed.totalPesewas).toBe(dish.pricePesewas + 1000);
});

test('link orders are refused without a contact, when switched off, or too far, and keep the stock', async () => {
  const { api, venue, dish, order } = await linkGuest();
  await api.ownerUpdateItem(venue.id, dish.id, { stockCount: 5 });
  expect(await codeOf(order({}))).toBe('missing_contact');
  expect(
    await codeOf(
      order({
        fulfilment: {
          type: 'delivery',
          contact,
          address: 'Far',
          location: { lat: 5.8, lng: -0.1822 },
        },
      }),
    ),
  ).toBe('too_far');
  const stock = (await api.getMenu('mamas-kitchen')).items.find(
    (item) => item.id === dish.id,
  )?.stockCount;
  expect(stock).toBe(5);
  await api.ownerUpdateVenue(venue.id, { onlineOrdering: { ...settings, enabled: false } });
  expect(await codeOf(order({ fulfilment: { type: 'pickup', contact } }))).toBe(
    'online_ordering_off',
  );
});

test('a table order is unchanged: source table and no contact, even if one is sent', async () => {
  const { api, setGuest } = await signedInMock();
  setGuest(
    (await api.createGuestSession({ venueSlug: 'mamas-kitchen', tableCode: '4' })).guestToken,
  );
  const dish = (await api.getMenu('mamas-kitchen')).items[0]!;
  const placed = await api.createOrder(
    {
      clientOrderId: crypto.randomUUID(),
      lines: [{ menuItemId: dish.id, quantity: 1 }],
      fulfilment: { type: 'pickup', contact },
    },
    { idempotencyKey: crypto.randomUUID() },
  );
  expect(placed.source).toBe('table');
  expect(placed.contact).toBeNull();
  expect(placed.tableCode).toBe('4');
});
