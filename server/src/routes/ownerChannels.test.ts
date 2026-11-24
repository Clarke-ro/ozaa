import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { expectContract } from '../contract/contract.ts';
import { chowdeckChannels } from '../db/schema.ts';
import { as, NOW, OWNER, ownerSetup, WAITER } from './ownerTestSetup.ts';

const owner = as('user_owner', OWNER);
const keys = {
  mode: 'test',
  merchantReference: 'mamas-osu',
  secretKey: 'chowSECRETkey9876',
  webhookSecret: 'hookSECRETvalue42',
};

test('channels: table, online and an unconnected Chowdeck, in that order', async () => {
  const { call, mamas } = await ownerSetup();
  const list = await call('GET', `/owner/venues/${mamas}/channels`, undefined, owner);
  expectContract('ownerListChannels', 200, list.json);
  assert.deepEqual(
    list.json.channels.map((c: { kind: string }) => c.kind),
    ['table', 'online', 'chowdeck'],
  );
  assert.equal(list.json.channels[2].chowdeck, null);
  assert.equal(list.json.channels[2].sync.state, 'off');
});

test('Chowdeck: connect, switch on, publish; the keys are sealed and never sent back', async () => {
  const { call, mamas, db, logs } = await ownerSetup();
  const base = `/owner/venues/${mamas}/channels`;

  const early = await call('PATCH', `${base}/chowdeck`, { enabled: true }, owner);
  assert.equal(early.status, 409);
  expectContract('ownerUpdateChannel', 409, early.json);
  assert.equal(early.json.code, 'channel_not_connected');

  const connected = await call('PUT', `${base}/chowdeck/keys`, keys, owner);
  expectContract('ownerConnectChowdeck', 200, connected.json);
  assert.equal(connected.json.chowdeck.secretKeyHint, '••••9876');
  assert.match(connected.json.chowdeck.webhookUrl, /\/v1\/webhooks\/chowdeck$/);
  assert.equal(connected.json.enabled, false);

  const off = await call('POST', `${base}/chowdeck/publish`, undefined, owner);
  expectContract('ownerPublishChannel', 409, off.json);
  assert.equal(off.json.code, 'channel_off');

  const on = await call(
    'PATCH',
    `${base}/chowdeck`,
    { enabled: true, priceRule: { percent: 20, roundToPesewas: 50 } },
    owner,
  );
  expectContract('ownerUpdateChannel', 200, on.json);
  assert.deepEqual(on.json.priceRule, { percent: 20, roundToPesewas: 50 });

  const queued = await call('POST', `${base}/chowdeck/publish`, undefined, owner);
  assert.equal(queued.status, 202);
  expectContract('ownerPublishChannel', 202, queued.json);
  assert.equal(queued.json.sync.state, 'pending');
  assert.equal(queued.json.sync.at, new Date(NOW).toISOString());

  // Stored sealed: neither secret is in the row or in anything sent back or logged.
  const [row] = await db.select().from(chowdeckChannels).where(eq(chowdeckChannels.venueId, mamas));
  const everything = JSON.stringify([row, connected.json, on.json, queued.json, logs]);
  assert.doesNotMatch(everything, /SECRET/);
  assert.ok(row?.secretEncrypted && row.webhookSecretEncrypted);
});

test('built-in channels are changed elsewhere; unknown channels are not found', async () => {
  const { call, mamas } = await ownerSetup();
  const base = `/owner/venues/${mamas}/channels`;
  const online = await call('PATCH', `${base}/online`, { enabled: false }, owner);
  expectContract('ownerUpdateChannel', 422, online.json);
  assert.equal(online.json.code, 'channel_built_in');
  const table = await call('POST', `${base}/table/publish`, undefined, owner);
  expectContract('ownerPublishChannel', 422, table.json);
  assert.equal((await call('PATCH', `${base}/glovo`, {}, owner)).status, 404);
});

test('disconnecting forgets the keys and switches Chowdeck off; only the owner may', async () => {
  const { call, mamas, db } = await ownerSetup();
  const base = `/owner/venues/${mamas}/channels`;
  assert.equal(
    (await call('PUT', `${base}/chowdeck/keys`, keys, as('user_waiter', WAITER))).status,
    403,
  );
  await call('PUT', `${base}/chowdeck/keys`, keys, owner);
  await call('PATCH', `${base}/chowdeck`, { enabled: true }, owner);
  const removed = await call('DELETE', `${base}/chowdeck/keys`, undefined, owner);
  expectContract('ownerDisconnectChowdeck', 200, removed.json);
  assert.equal(removed.json.enabled, false);
  assert.equal(removed.json.chowdeck, null);
  const [row] = await db.select().from(chowdeckChannels).where(eq(chowdeckChannels.venueId, mamas));
  assert.equal(row?.secretEncrypted, null);
  assert.equal(row?.webhookSecretEncrypted, null);
});

test('live keys are refused: test mode only', async () => {
  const { call, mamas } = await ownerSetup();
  const live = await call(
    'PUT',
    `/owner/venues/${mamas}/channels/chowdeck/keys`,
    { ...keys, mode: 'live' },
    owner,
  );
  assert.equal(live.status, 400);
});
