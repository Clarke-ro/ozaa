import { test } from 'node:test';
import assert from 'node:assert/strict';
import { arkeselSender } from './arkesel.ts';
import { readLoyaltyToken, signLoyaltyToken } from '../guest/loyaltyToken.ts';
import { encryptionKey } from '../secrets/sealed.ts';

test('Arkesel gets the key in a header and the number without the plus; a refusal names no number', async () => {
  const seen: { url: string; init: RequestInit }[] = [];
  let reply = { status: 'success' };
  const send = arkeselSender({
    apiKey: 'ark_test_key',
    sender: 'Cravins',
    fetchFn: (async (url: string, init: RequestInit) => {
      seen.push({ url, init });
      return Response.json(reply);
    }) as typeof fetch,
  });
  await send('+233241234567', '123456 is your code');
  assert.equal(seen[0]!.url, 'https://sms.arkesel.com/api/v2/sms/send');
  assert.equal((seen[0]!.init.headers as Record<string, string>)['api-key'], 'ark_test_key');
  assert.deepEqual(JSON.parse(String(seen[0]!.init.body)), { sender: 'Cravins', message: '123456 is your code', recipients: ['233241234567'] });
  reply = { status: 'error' };
  await assert.rejects(send('+233241234567', 'x'), (error: Error) => !error.message.includes('241234567'));
});

test('a loyalty token opens only with the server key, unchanged and in date', () => {
  const key = encryptionKey('b'.repeat(64));
  const token = signLoyaltyToken(key, '+233241234567', 2000);
  assert.equal(readLoyaltyToken(key, token, 1000), '+233241234567');
  assert.equal(readLoyaltyToken(key, token, 3000), null);
  assert.equal(readLoyaltyToken(encryptionKey('c'.repeat(64)), token, 1000), null);
  assert.equal(readLoyaltyToken(key, `${token.slice(0, -2)}xx`, 1000), null);
  assert.equal(readLoyaltyToken(key, undefined, 1000), null);
});
