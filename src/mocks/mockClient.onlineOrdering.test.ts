import { signedInMock } from './testOwner';

// Auntie Akos is the sample that takes payment in person, with no online ordering, until its
// owner (Akosua) sets them up. Mama's Kitchen and Bean There start with both on.
const AKOSUA = '+233240000005';

test('online ordering is off until the owner saves it, then guests can read it', async () => {
  const api = (await signedInMock(Date.now(), AKOSUA)).api;
  const venue = await api.getVenue('auntie-akos');
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
  expect((await api.getVenue('auntie-akos')).onlineOrdering).toEqual(onlineOrdering);
  expect((await api.ownerGetVenue(venue.id)).onlineOrdering).toEqual(onlineOrdering);
});
