import { signedInMock } from './testOwner';

test('a new call shows as unread, opens the right call and leaves the feed queue once answered', async () => {
  const { api, setGuest } = await signedInMock();
  const { id } = await api.getVenue('mamas-kitchen');
  const session = await api.createGuestSession({ venueSlug: 'mamas-kitchen', tableCode: '9' });
  setGuest(session.guestToken);
  const call = await api.callWaiter({ reason: 'water' }, { idempotencyKey: 'call-n1' });
  const feed = await api.ownerListNotifications(id);
  const row = feed.items.find((item) => item.target.id === call.id)!;
  expect(row).toMatchObject({
    kind: 'call',
    readAt: null,
    needsAction: true,
    target: { type: 'call' },
  });
  await api.ownerUpdateWaiterCall(call.id, { reply: 'Coming now' });
  const after = await api.ownerListNotifications(id);
  expect(after.items.find((item) => item.id === row.id)?.needsAction).toBe(false);
  const queue = await api.ownerListWaiterCalls(id);
  expect(queue.items.some((item) => item.id === call.id)).toBe(false);
});

test('mark all as read is per person; a kitchen account never sees guest notes', async () => {
  const owner = await signedInMock();
  const { id } = await owner.api.getVenue('mamas-kitchen');
  const before = await owner.api.ownerListNotifications(id);
  expect(before.unreadCount).toBeGreaterThan(0);
  expect((await owner.api.ownerMarkNotificationsRead(id)).unreadCount).toBe(0);
  expect((await owner.api.ownerListNotifications(id, { unread: true })).items).toEqual([]);
  const kitchen = await signedInMock(Date.now(), '+233240000003');
  const theirs = await kitchen.api.ownerListNotifications(id);
  expect(theirs.items.every((item) => item.kind === 'order')).toBe(true);
});

test('profile changes come back on getMe; a new phone needs the code first', async () => {
  const { api, auth } = await signedInMock();
  await api.updateMyProfile({
    lastName: 'Owusu',
    prefs: {
      language: 'en',
      appearance: 'dark',
      soundForNewOrders: false,
      notify: { order: true, call: true, bill: true, guest_note: false, review: true },
    },
  });
  const me = await api.getMe();
  expect(me).toMatchObject({
    lastName: 'Owusu',
    prefs: { appearance: 'dark', soundForNewOrders: false },
  });
  await auth.sendPhoneChangeCode('+233249998877');
  await expect(auth.confirmPhoneChange('000000')).rejects.toMatchObject({ status: 401 });
  await auth.confirmPhoneChange('123456');
  expect((await api.getMe()).phone).toBe('+233249998877');
});
