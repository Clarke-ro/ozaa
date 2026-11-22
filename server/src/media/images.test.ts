import { test } from 'node:test';
import assert from 'node:assert/strict';
import { media } from '../db/schema.ts';
import { testDbWithOrder } from '../db/testDb.ts';
import { Problem } from '../http/problem.ts';
import { imageFor } from './images.ts';
import type { MediaStorage } from './storage.ts';

test('a file that is not the signed photo is deleted and not attached', async () => {
  const db = await testDbWithOrder();
  await db.insert(media).values({ id: 'med_1', venueId: 'ven_1', kind: 'dish_photo', contentType: 'image/png', path: 'ven_1/med_1.png' });
  const removed: string[] = [];
  const storage: MediaStorage = {
    signUpload: async () => 'https://storage.test/upload',
    publicUrl: (path) => `https://storage.test/public/${path}`,
    inspect: async () => ({ ok: false, reason: 'rejected' }),
    remove: async (path) => {
      removed.push(path);
    },
  };
  await assert.rejects(imageFor(db, storage, 'ven_1', 'med_1'), (error: unknown) => error instanceof Problem && error.code === 'media_not_found');
  assert.deepEqual(removed, ['ven_1/med_1.png']);
});
