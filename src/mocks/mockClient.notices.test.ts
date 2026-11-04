import { createMockClient } from './mockClient';

const now = Date.parse('2026-11-04T12:00:00Z');

/** A mock signed in as Ama, the sample owner, through the same code login the app uses. */
async function ownerApi() {
  let access: string | null = null;
  const api = createMockClient({
    now: () => now,
    tokens: { guest: () => null, access: () => access },
  });
  const phone = '+233240000001';
  await api.requestOtp({ phone, purpose: 'owner_login' }, { idempotencyKey: 'otp-test' });
  access = (await api.verifyOtp({ phone, code: '123456', purpose: 'owner_login' })).accessToken;
  return api;
}

test('guests get only live notices; the owner gets every setting back', async () => {
  const api = await ownerApi();
  const venue = await api.getVenue('mamas-kitchen');
  expect(venue.notices).toEqual({ banner: null, popup: null });

  const banner = { enabled: true, text: 'Kitchen closes at 9 tonight' };
  const popup = {
    enabled: true,
    title: 'Tomorrow',
    text: 'Live band',
    startsAt: '2026-11-05T18:00:00Z',
  };
  const saved = await api.ownerUpdateVenue(venue.id, { noticeSettings: { banner, popup } });
  expect(saved.noticeSettings).toEqual({ banner, popup });

  const guest = await api.getVenue('mamas-kitchen');
  expect(guest.notices).toEqual({ banner, popup: null });
});

test('saving only the popup keeps the banner', async () => {
  const api = await ownerApi();
  const { id } = await api.getVenue('mamas-kitchen');
  const banner = { enabled: true, text: 'Open late' };
  await api.ownerUpdateVenue(id, { noticeSettings: { banner } });
  await api.ownerUpdateVenue(id, { noticeSettings: { popup: { enabled: false, text: 'Hi' } } });
  expect((await api.ownerGetVenue(id)).noticeSettings?.banner).toEqual(banner);
});
