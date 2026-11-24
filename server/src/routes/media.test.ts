import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { expectContract } from '../contract/contract.ts';
import { as, KITCHEN, OWNER, ownerSetup } from './ownerTestSetup.ts';

const owner = as('user_owner', OWNER);

test('a dish photo: upload URL, the file arrives, then the dish shows it with its size', async () => {
  const { call, mamas, upload, stored } = await ownerSetup();
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
  // Guests get the server's copy: 1080 wide (from the phone's 2400), WebP, next to the original.
  const copy = `${mamas}/${slot.json.mediaId}-1080.webp`;
  assert.deepEqual(saved.json.photo, {
    url: `https://storage.test/public/${copy}`,
    width: 1080,
    height: 810,
  });
  assert.equal((await sharp(stored.get(copy) as Uint8Array).metadata()).format, 'webp');
  const guest = (await call('GET', '/venues/mamas-kitchen/menu')).json.items.find(
    (i: { id: string }) => i.id === dish.id,
  );
  assert.equal(guest.photo.width, 1080);

  // Used again (on another dish), it's the same copy: nothing is resized twice.
  const files = stored.size;
  const second = (await call('GET', '/venues/mamas-kitchen/menu')).json.items[1];
  const again = await call(
    'PATCH',
    `/owner/venues/${mamas}/menu/items/${second.id}`,
    { photoMediaId: slot.json.mediaId },
    owner,
  );
  assert.equal(again.json.photo.url, saved.json.photo.url);
  assert.equal(stored.size, files);

  // null takes the photo off.
  assert.equal((await call('PATCH', path, { photoMediaId: null }, owner)).json.photo, null);
});

test('uploads: owners and managers only, images only, 5 MB at most, and only into your own venue', async () => {
  const { call, mamas, upload } = await ownerSetup();
  const ask = { kind: 'logo', contentType: 'image/png', sizeBytes: 50_000 };
  assert.equal(
    (await call('POST', `/owner/venues/${mamas}/media`, ask, as('user_kitchen', KITCHEN))).status,
    403,
  );
  assert.equal(
    (
      await call(
        'POST',
        `/owner/venues/${mamas}/media`,
        { ...ask, contentType: 'image/gif' },
        owner,
      )
    ).status,
    400,
  );
  assert.equal(
    (await call('POST', `/owner/venues/${mamas}/media`, { ...ask, sizeBytes: 6_000_000 }, owner))
      .status,
    400,
  );

  // A photo uploaded for another venue can't be put on this venue's dish.
  const bean = (await call('GET', '/venues/bean-there')).json.id;
  const other = (
    await call('POST', `/owner/venues/${bean}/media`, { ...ask, kind: 'dish_photo' }, owner)
  ).json;
  upload(other.uploadUrl);
  const dish = (await call('GET', '/venues/mamas-kitchen/menu')).json.items[0];
  const crossed = await call(
    'PATCH',
    `/owner/venues/${mamas}/menu/items/${dish.id}`,
    { photoMediaId: other.mediaId },
    owner,
  );
  assert.equal(crossed.json.code, 'media_not_found');
});

test('a file that is not a photo is refused, and the dish keeps its photo', async () => {
  const { call, mamas, upload } = await ownerSetup();
  const ask = { kind: 'dish_photo', contentType: 'image/jpeg', sizeBytes: 1000 };
  const slot = (await call('POST', `/owner/venues/${mamas}/media`, ask, owner)).json;
  upload(slot.uploadUrl, new TextEncoder().encode('not a photo'));
  const dish = (await call('GET', '/venues/mamas-kitchen/menu')).json.items[0];
  const res = await call(
    'PATCH',
    `/owner/venues/${mamas}/menu/items/${dish.id}`,
    { photoMediaId: slot.mediaId },
    owner,
  );
  assert.equal(res.status, 422);
  assert.equal(res.json.code, 'media_not_found');
  const after = (await call('GET', '/venues/mamas-kitchen/menu')).json.items[0];
  assert.deepEqual(after.photo, dish.photo);
});
