import { ownerApi } from './testOwner';

test('the menu style reaches guests, and saving one choice keeps the others', async () => {
  const api = await ownerApi();
  const { id } = await api.getVenue('mamas-kitchen');
  await api.ownerUpdateVenue(id, { menuStyle: { itemSort: 'price_low', layout: 'grid' } });
  await api.ownerUpdateVenue(id, { menuStyle: { colorScheme: 'dark' } });
  const guest = await api.getVenue('mamas-kitchen');
  expect(guest.menuStyle).toEqual({ itemSort: 'price_low', layout: 'grid', colorScheme: 'dark' });
});
