import { ApiError } from '@/lib/api/errors';
import { createMockApi } from './mockClient';
import { signedInMock } from './testOwner';

const keys = {
  mode: 'test' as const,
  merchantReference: 'mamas-osu',
  secretKey: 'chowSECRETkey9876',
  webhookSecret: 'hookSECRETvalue42',
};

async function codeOf(promise: Promise<unknown>) {
  try {
    await promise;
    return 'ok';
  } catch (error) {
    return error instanceof ApiError ? error.code : String(error);
  }
}

test('every venue lists table, online and an unconnected Chowdeck', async () => {
  const { api } = await signedInMock();
  const { id } = await api.getVenue('mamas-kitchen');
  const { channels } = await api.ownerListChannels(id);
  expect(channels.map((c) => [c.kind, c.enabled])).toEqual([
    ['table', true],
    ['online', true],
    ['chowdeck', false],
  ]);
  expect(channels[2]!.chowdeck).toBeNull();
});

test('connect, switch on and publish Chowdeck; the keys never come back', async () => {
  const at = Date.parse('2026-11-24T12:00:00.000Z');
  const { api } = await signedInMock(at);
  const { id } = await api.getVenue('mamas-kitchen');
  expect(await codeOf(api.ownerUpdateChannel(id, 'chowdeck', { enabled: true }))).toBe(
    'channel_not_connected',
  );

  const connected = await api.ownerConnectChowdeck(id, keys);
  expect(connected.chowdeck).toMatchObject({ merchantReference: 'mamas-osu', mode: 'test' });
  expect(connected.chowdeck?.secretKeyHint).toBe('••••9876');
  expect(connected.chowdeck?.webhookUrl).toMatch(/\/webhooks\/chowdeck$/);
  expect(connected.enabled).toBe(false);
  expect(await codeOf(api.ownerPublishChannel(id, 'chowdeck'))).toBe('channel_off');

  const on = await api.ownerUpdateChannel(id, 'chowdeck', {
    enabled: true,
    priceRule: { percent: 20, roundToPesewas: 50 },
  });
  expect(on.priceRule).toEqual({ percent: 20, roundToPesewas: 50 });
  const queued = await api.ownerPublishChannel(id, 'chowdeck');
  expect(queued.sync).toMatchObject({ state: 'pending', at: '2026-11-24T12:00:00.000Z' });

  const everything = JSON.stringify([connected, on, queued, await api.ownerListChannels(id)]);
  expect(everything).not.toContain('SECRET');
});

test('built-in channels are changed elsewhere, and disconnecting switches Chowdeck off', async () => {
  const { api } = await signedInMock();
  const { id } = await api.getVenue('mamas-kitchen');
  expect(await codeOf(api.ownerUpdateChannel(id, 'online', { enabled: false }))).toBe(
    'channel_built_in',
  );
  await api.ownerConnectChowdeck(id, keys);
  await api.ownerUpdateChannel(id, 'chowdeck', { enabled: true });
  const off = await api.ownerDisconnectChowdeck(id);
  expect(off).toMatchObject({ enabled: false, chowdeck: null });
});

test('only the owner may save or remove the Chowdeck keys', async () => {
  const { api } = await signedInMock(Date.now(), '+233240000002');
  const { id } = await api.getVenue('mamas-kitchen');
  expect(await codeOf(api.ownerConnectChowdeck(id, keys))).toBe('forbidden');
  expect(await codeOf(api.ownerDisconnectChowdeck(id))).toBe('forbidden');
});

test('the mock finishes a send after 3 s, naming dishes Chowdeck cannot take', async () => {
  let clock = Date.parse('2026-11-24T12:00:00.000Z');
  let access: string | null = null;
  const { api, auth } = createMockApi({
    now: () => clock,
    tokens: { guest: () => null, access: () => access },
  });
  await auth.sendCode('+233240000001');
  await auth.verifyCode('123456');
  access = await auth.getToken();
  const { id } = await api.getVenue('mamas-kitchen');
  await api.ownerConnectChowdeck(id, keys);
  await api.ownerUpdateChannel(id, 'chowdeck', { enabled: true });
  await api.ownerPublishChannel(id, 'chowdeck');
  expect((await api.ownerListChannels(id)).channels[2]!.sync.state).toBe('pending');
  clock += 3_000;
  const done = (await api.ownerListChannels(id)).channels[2]!;
  expect(done.sync.state).toBe('synced');
  expect(done.sync.menuUpdatedAt).toBe((await api.getMenu('mamas-kitchen')).updatedAt);
  expect(done.sync.problems.every((p) => p.code === 'needs_addons')).toBe(true);
});
