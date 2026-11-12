import { signedInMock } from './testOwner';

test('a guest who scans and opens the menu moves the funnel, and Today agrees on visits', async () => {
  const { api, setGuest } = await signedInMock();
  const { id } = await api.getVenue('mamas-kitchen');
  const before = await api.ownerGetInsights(id, 'today');
  const today = await api.ownerGetDashboard(id);
  expect(before.sample).toBe(false);
  expect(before.scansCount).toBe(today.visitorsToday);

  const session = await api.createGuestSession({ venueSlug: 'mamas-kitchen', tableCode: '5' });
  setGuest(session.guestToken);
  await api.getMenu('mamas-kitchen');
  await api.getMenu('mamas-kitchen');
  const after = await api.ownerGetInsights(id, 'today');
  expect(after.scansCount).toBe((before.scansCount ?? 0) + 1);
  expect(after.menuViewsCount).toBe((before.menuViewsCount ?? 0) + 1);
});

test('a custom range needs both dates and covers only that window', async () => {
  const { api } = await signedInMock();
  const { id } = await api.getVenue('mamas-kitchen');
  await expect(api.ownerGetInsights(id, 'custom')).rejects.toMatchObject({ status: 400 });
  const empty = await api.ownerGetInsights(id, 'custom', {
    since: '2001-01-01T00:00:00Z',
    until: '2001-01-03T00:00:00Z',
  });
  expect(empty.salesPesewas).toBe(0);
  expect(empty.series).toHaveLength(2);
});

test('a venue with no history has no previous period on Sales', async () => {
  const { api } = await signedInMock(Date.now(), '+233240000005');
  const { id } = await api.getVenue('auntie-akos');
  const sales = await api.ownerGetSales(id, {
    since: new Date(Date.now() - 86_400_000).toISOString(),
  });
  expect(sales.previous).toBeNull();
  expect(sales.tax).toBeNull();
});

test('sales compare with the period before, and tax shows only once set up', async () => {
  const { api } = await signedInMock();
  const { id } = await api.getVenue('mamas-kitchen');
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const week = await api.ownerGetSales(id, { since });
  expect(week.previous?.orderCount).toBeGreaterThan(0);
  expect(week.byStaff.length).toBeGreaterThan(0);
  expect(week.tax).toBeNull();
  await api.ownerUpdateVenue(id, {
    tax: { enabled: true, pricesIncludeTax: true, tin: 'C0012345678' },
  });
  expect((await api.ownerGetSales(id, { since })).tax).not.toBeNull();
  const guestView = await api.getVenue('mamas-kitchen');
  expect('tax' in guestView).toBe(false);
});
