import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readGuestToken, signGuestToken } from './token.ts';

const secret = 'test-secret-at-least-32-characters-long';

test('a signed guest token reads back; a changed, foreign or expired one does not', () => {
  const token = signGuestToken(secret, { venueId: 'ven_1', tableCode: '12', exp: 2_000 });
  assert.deepEqual({ ...readGuestToken(secret, token, 1_000), sid: 'x' }, { sid: 'x', venueId: 'ven_1', tableCode: '12', exp: 2_000 });
  assert.equal(readGuestToken(secret, token, 2_000), null);
  assert.equal(readGuestToken('another-secret-at-least-32-characters', token, 1_000), null);
  const [head, payload, sig] = token.split('.');
  const moved = Buffer.from(Buffer.from(payload ?? '', 'base64url').toString().replace('"12"', '"1"')).toString('base64url');
  assert.equal(readGuestToken(secret, `${head}.${moved}.${sig}`, 1_000), null);
  assert.equal(readGuestToken(secret, undefined, 1_000), null);
});
