import { test } from 'node:test';
import assert from 'node:assert/strict';
import { expectContract } from '../contract/contract.ts';
import { as, KITCHEN, OWNER, ownerSetup } from './ownerTestSetup.ts';

const owner = as('user_owner', OWNER);

test('a dish photo: upload URL, the file arrives, then the dish shows it with its size', async () => {
  const { call, mamas, upload } = await ownerSetup();
  const ask = { kind: 'dish_photo', contentType: 'image/jpeg', sizeBytes: 1_200_000 };
  const slot = await call('POST', `/owner/venues/${mamas}/media`, ask, owner);
  expectContract('ownerCreateMediaUpload', 201, slot.json);
  assert.match(slot.json.uploadUrl, new RegExp(`/upload/${mamas}/${slot.json.mediaId}\\.jpg`));

  const dish = (await call('GET', '/venues/mamas-kitchen/menu')).json.items[0];
  const path = `/owner/venues/${mamas}/menu/items/${dish.id}`;
  // Saved before the file arrived: refused, and the dish keeps its old photo.
  const early = await call('PATCH', path, { photoMediaId: slot.json.mediaId }, owner);
  assert.equal(early.json.code, 'media_not_found');

  upload(slot.json.uploadUrl);
  const saved = await call('PATCH', path, { photoMediaId: slot.json.mediaId }, owner);
  expectContract('ownerUpdateItem', 200, saved.json);
  assert.deepEqual(saved.json.photo, { url: `https://storage.test/public/${mamas}/${slot.json.mediaId}.jpg`, width: 800, height: 600 });
  const guest = (await call('GET', '/venues/mamas-kitchen/menu')).json.items.find((i: { id: string }) => i.id === dish.id);
  assert.equal(guest.photo.width, 800);

  // null takes the photo off.
  assert.equal((await call('PATCH', path, { photoMediaId: null }, owner)).json.photo, null);
});

test('uploads: owners and managers only, images only, 5 MB at most, and only into your own venue', async () => {
  const { call, mamas, upload } = await ownerSetup();
  const ask = { kind: 'logo', contentType: 'image/png', sizeBytes: 50_000 };
  assert.equal((await call('POST', `/owner/venues/${mamas}/media`, ask, as('user_kitchen', KITCHEN))).status, 403);
  assert.equal((await call('POST', `/owner/venues/${mamas}/media`, { ...ask, contentType: 'image/gif' }, owner)).status, 400);
  assert.equal((await call('POST', `/owner/venues/${mamas}/media`, { ...ask, sizeBytes: 6_000_000 }, owner)).status, 400);

  // A photo uploaded for another venue can't be put on this venue's dish.
  const bean = (await call('GET', '/venues/bean-there')).json.id;
  const other = (await call('POST', `/owner/venues/${bean}/media`, { ...ask, kind: 'dish_photo' }, owner)).json;
  upload(other.uploadUrl);
  const dish = (await call('GET', '/venues/mamas-kitchen/menu')).json.items[0];
  const crossed = await call('PATCH', `/owner/venues/${mamas}/menu/items/${dish.id}`, { photoMediaId: other.mediaId }, owner);
  assert.equal(crossed.json.code, 'media_not_found');
});
