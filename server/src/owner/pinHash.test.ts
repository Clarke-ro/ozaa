import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkPin, hashPin } from './pinHash.ts';

test('a PIN is kept only as a salted slow hash, and checks back', async () => {
  const stored = await hashPin('4821');
  assert.ok(!stored.includes('4821'));
  assert.ok(stored.startsWith('scrypt$'));
  assert.equal(await checkPin('4821', stored), true);
  assert.equal(await checkPin('4822', stored), false);
  // A fresh salt each time: two people with the same PIN don't share a hash.
  assert.notEqual(await hashPin('4821'), stored);
  // Anything that isn't one of our hashes is simply not a match.
  assert.equal(await checkPin('4821', 'garbage'), false);
});
