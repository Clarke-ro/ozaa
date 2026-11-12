import { signedInMock } from './testOwner';

test('Customers and Loyalty count the same members', async () => {
  const { api } = await signedInMock();
  const { id } = await api.getVenue('mamas-kitchen');
  const customers = await api.ownerListLoyaltyCustomers(id);
  const programme = await api.ownerGetLoyalty(id);
  const analytics = await api.ownerGetLoyaltyAnalytics(id, '30d');
  expect(customers.totalCount).toBe(programme.memberCount);
  expect(analytics.enrolledCount).toBe(programme.memberCount);
  expect(customers.items.every((c) => /\*\*\* \d{4}$/.test(c.phoneMasked))).toBe(true);
});

test('search by last 4 digits and filter by tag', async () => {
  const { api } = await signedInMock();
  const { id } = await api.getVenue('mamas-kitchen');
  const { items, countsByTag } = await api.ownerListLoyaltyCustomers(id);
  const first = items[0]!;
  const last4 = first.phoneMasked.slice(-4);
  const found = await api.ownerListLoyaltyCustomers(id, { search: last4 });
  expect(found.items.map((c) => c.id)).toContain(first.id);
  const regulars = await api.ownerListLoyaltyCustomers(id, { tag: 'regular' });
  expect(regulars.items.length).toBe(countsByTag?.regular ?? 0);
  expect(regulars.items.every((c) => c.tags?.includes('regular'))).toBe(true);
});

test('a manual stamp shows on the guest, in the scan log and once per hour', async () => {
  const { api } = await signedInMock();
  const { id } = await api.getVenue('mamas-kitchen');
  const quiet =
    (await api.ownerListLoyaltyCustomers(id, { tag: 'quiet' })).items[0] ??
    (await api.ownerListLoyaltyCustomers(id)).items.at(-1)!;
  const before = await api.ownerGetLoyaltyCustomer(id, quiet.id);
  const result = await api.ownerStampLoyaltyCustomer(id, quiet.id, { idempotencyKey: 'stamp-1' });
  expect(result.success).toBe(true);
  const after = await api.ownerGetLoyaltyCustomer(id, quiet.id);
  expect(after.stamps).toBe(Math.min(result.stamps, before.stamps + 1));
  const log = await api.ownerListLoyaltyScans(id);
  expect(log.items[0]).toMatchObject({ customerId: quiet.id, action: 'stamp', by: 'Ama' });
  const again = await api.ownerStampLoyaltyCustomer(id, quiet.id, { idempotencyKey: 'stamp-2' });
  expect(again).toMatchObject({ success: false, cooldownViolated: true });
});

test('customer detail lists their visits from real orders', async () => {
  const { api } = await signedInMock();
  const { id } = await api.getVenue('mamas-kitchen');
  const regular = (await api.ownerListLoyaltyCustomers(id, { tag: 'regular' })).items[0]!;
  const detail = await api.ownerGetLoyaltyCustomer(id, regular.id);
  expect(detail.visits.length).toBe(Math.min(20, regular.visitCount ?? 0));
  expect(detail.visits[0]?.orderId).toMatch(/^ord_/);
  expect(detail.consent.textVersion).toBeTruthy();
});
