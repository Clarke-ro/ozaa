import { env } from '@/lib/env';
import { ownerApi } from './testOwner';

// Printed table QR codes must open that table on the site the app runs on, never a domain that
// isn't ours yet (they held https://cravins.app/…, which nobody could open, 2026-11-16).
test("every table QR opens that table on the app's own site", async () => {
  const api = await ownerApi();
  const me = await api.getMe();
  const venueId = me.venues[0]?.venueId ?? '';
  const { items } = await api.ownerListTables(venueId);
  expect(items.length).toBeGreaterThan(0);
  for (const table of items) {
    expect(table.qrUrl).toBe(`${env.EXPO_PUBLIC_SITE_URL}/mamas-kitchen/t/${table.code}`);
  }
  const added = await api.ownerCreateTables(venueId, { codes: ['41'] });
  expect(added.items[0]?.qrUrl).toBe(`${env.EXPO_PUBLIC_SITE_URL}/mamas-kitchen/t/41`);
});
