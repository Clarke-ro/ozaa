import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { MAX_WIDTH, shrink } from './shrink.ts';

/** A plain test photo, as a phone would send it. */
const photo = (width: number, height: number, options: { orientation?: number } = {}) =>
  sharp({ create: { width, height, channels: 3, background: '#B5432A' } })
    .jpeg()
    .withMetadata({ orientation: options.orientation })
    .toBuffer();

test('a big dish photo comes back smaller, as WebP, with its new size', async () => {
  const out = await shrink(await photo(4000, 3000), 'dish_photo');
  assert.equal(out.width, MAX_WIDTH.dish_photo);
  assert.equal(out.height, Math.round((MAX_WIDTH.dish_photo * 3) / 4));
  const meta = await sharp(out.bytes).metadata();
  assert.equal(meta.format, 'webp');
  assert.equal(meta.width, out.width);
});

test('each kind has its own size: banners wider, logos small', async () => {
  const big = await photo(4000, 2000);
  assert.equal((await shrink(big, 'banner')).width, MAX_WIDTH.banner);
  assert.equal((await shrink(big, 'logo')).width, MAX_WIDTH.logo);
  assert.ok(MAX_WIDTH.logo < MAX_WIDTH.dish_photo && MAX_WIDTH.dish_photo < MAX_WIDTH.banner);
});

test('a small photo is not blown up', async () => {
  const out = await shrink(await photo(300, 200), 'dish_photo');
  assert.deepEqual([out.width, out.height], [300, 200]);
});

test('a phone photo taken sideways is turned upright, and its hidden data is dropped', async () => {
  // EXIF orientation 6: the camera stored it on its side and asks viewers to turn it.
  const out = await shrink(await photo(1200, 800, { orientation: 6 }), 'dish_photo');
  assert.deepEqual([out.width, out.height], [800, 1200]);
  const meta = await sharp(out.bytes).metadata();
  assert.equal(meta.orientation, undefined);
  assert.equal(meta.exif, undefined);
});

test('a file that is not a photo is refused', async () => {
  await assert.rejects(shrink(new Uint8Array([1, 2, 3, 4]), 'dish_photo'));
});
