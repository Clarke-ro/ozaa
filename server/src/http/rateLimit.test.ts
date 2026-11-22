import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clientIp, slidingWindow } from './rateLimit.ts';

test('allows up to the limit in the window, then refuses until old hits age out', () => {
  let now = 0;
  const limit = slidingWindow({ limit: 3, windowMs: 1000, now: () => now });
  assert.deepEqual([limit.hit('a'), limit.hit('a'), limit.hit('a'), limit.hit('a')], [true, true, true, false]);
  assert.equal(limit.hit('b'), true, 'each caller has their own count');
  now = 1001;
  assert.equal(limit.hit('a'), true);
});

test('a counted hit can be given back when that request does not go through', () => {
  let now = 0;
  const limit = slidingWindow({ limit: 1, windowMs: 1000, now: () => now });
  assert.equal(limit.hit('a'), true);
  assert.equal(limit.hit('a'), false);
  limit.drop('a');
  assert.equal(limit.hit('a'), true);
  limit.drop('missing');
});

test('forgets callers whose hits have all aged out, so memory does not grow', () => {
  let now = 0;
  const limit = slidingWindow({ limit: 5, windowMs: 1000, now: () => now });
  for (let i = 0; i < 100; i += 1) limit.hit(`ip${i}`);
  now = 5000;
  limit.hit('fresh');
  assert.equal(limit.size(), 1);
});

test("the caller's address is the last one Heroku's router added; earlier ones can be faked", () => {
  assert.equal(clientIp('6.6.6.6, 1.2.3.4'), '1.2.3.4');
  assert.equal(clientIp(' 1.2.3.4 '), '1.2.3.4');
  assert.equal(clientIp(undefined), 'unknown');
});
