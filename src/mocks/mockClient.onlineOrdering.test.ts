import { ownerApi } from './testOwner';

test('online ordering is off until the owner saves it, then guests can read it', async () => {
  const api = await ownerApi();
  const venue = await api.getVenue('mamas-kitchen');
  expect(venue.onlineOrdering).toBeUndefined();
  const onlineOrdering = {
    enabled: true,
    pickup: { enabled: true, prepMinutes: 25 },
    delivery: {
      enabled: true,
      minimumFeePesewas: 1000,
      feePerKmPesewas: 250,
      maxDistanceKm: 8,
      freeOverPesewas: null,
    },
  };
  await api.ownerUpdateVenue(venue.id, { onlineOrdering });
  expect((await api.getVenue('mamas-kitchen')).onlineOrdering).toEqual(onlineOrdering);
  expect((await api.ownerGetVenue(venue.id)).onlineOrdering).toEqual(onlineOrdering);
});
