import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.ts';
import { expectContract } from '../contract/contract.ts';
import { otpCodes, otpPhoneLimits } from '../db/schema.ts';
import { testDb } from '../db/testDb.ts';
import { readLoyaltyToken } from '../guest/loyaltyToken.ts';
import { signGuestToken } from '../guest/token.ts';
import type { PaymentService } from '../payments.ts';
import type { SmsSender } from '../sms/arkesel.ts';
import { TEST_KEY } from './testHelpers.ts';

const PHONE = '+233241234567';
const SECRET = 'x'.repeat(32);

async function setup(dailyLimit = 300, sms?: SmsSender) {
  const db = await testDb();
  let clock = Date.parse('2026-11-17T12:00:00Z');
  const texts: { to: string; text: string }[] = [];
  const send = sms ?? (async (to: string, text: string) => void texts.push({ to, text }));
  const app = createApp({
    payments: {} as PaymentService,
    otp: { db, now: () => clock, hashSecret: SECRET, guestSecret: SECRET, loyaltyKey: TEST_KEY, sms: send, dailyLimit, ipPerHour: 10 },
    allowedOrigins: [],
    log: () => undefined,
    ping: async () => undefined,
  });
  const call = async (path: string, body: unknown, ip = '1.2.3.4', authorization?: string) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', 'x-forwarded-for': `9.9.9.9, ${ip}` };
    if (authorization) headers.Authorization = authorization;
    const res = await app.request(`/v1${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
    return { status: res.status, json: (await res.json().catch(() => null)) as { code?: string; accessToken?: string } };
  };
  const ask = (phone = PHONE, ip?: string, authorization?: string) => call('/auth/otp/request', { phone, purpose: 'guest_loyalty' }, ip, authorization);
  const codeIn = (i = -1) => texts.at(i)!.text.slice(0, 6);
  const guest = (venueId: string) => `Bearer ${signGuestToken(SECRET, { venueId, tableCode: '1', exp: Date.parse('2027-01-01T00:00:00Z') })}`;
  return { db, call, ask, texts, codeIn, guest, tick: (ms: number) => (clock += ms), now: () => clock };
}

const wrongCode = (real: string) => (real === '000000' ? '111111' : '000000');

test('a code by SMS, once, proves the phone; the token holds the number sealed', async () => {
  const { call, ask, texts, codeIn, now } = await setup();
  const sent = await ask();
  expectContract('requestOtp', 202, sent.json);
  assert.equal(texts[0]!.to, PHONE);
  const wrong = await call('/auth/otp/verify', { phone: PHONE, code: codeIn() === '000000' ? '111111' : '000000', purpose: 'guest_loyalty' });
  expectContract('verifyOtp', 401, wrong.json);
  const ok = await call('/auth/otp/verify', { phone: PHONE, code: codeIn(), purpose: 'guest_loyalty' });
  expectContract('verifyOtp', 200, ok.json);
  const accessToken = ok.json.accessToken ?? '';
  assert.ok(accessToken && !accessToken.includes('241234567'));
  assert.equal(readLoyaltyToken(TEST_KEY, accessToken, now()), PHONE);
  // The same code can't be used twice.
  assert.equal((await call('/auth/otp/verify', { phone: PHONE, code: codeIn(), purpose: 'guest_loyalty' })).status, 401);
});

test('limits: 30 seconds between texts, 5 a phone an hour, the address cap, 5 guesses a code', async () => {
  const { call, ask, tick } = await setup();
  await ask();
  assert.equal((await ask()).json.code, 'resend_too_soon');
  for (let i = 0; i < 4; i += 1) {
    tick(31_000);
    assert.equal((await ask()).status, 202);
  }
  tick(31_000);
  assert.equal((await ask()).status, 429);
  for (let i = 0; i < 5; i += 1) assert.equal((await ask(`+23320000000${i}`)).status, 202);
  assert.equal((await ask('+233200000009')).status, 429, 'the same IP hit its hourly cap');
  assert.equal((await ask('+233200000009', '5.6.7.8')).status, 202);

  tick(31_000);
  await ask('+233270000000', '8.8.8.8');
  for (let i = 0; i < 5; i += 1) await call('/auth/otp/verify', { phone: '+233270000000', code: '999999', purpose: 'guest_loyalty' });
  assert.equal((await call('/auth/otp/verify', { phone: '+233270000000', code: '999999', purpose: 'guest_loyalty' })).status, 429);
});

test('parallel wrong guesses cannot get past the five tries on one code', async () => {
  const { call, ask, codeIn, db } = await setup();
  await ask();
  const code = wrongCode(codeIn());
  const guesses = await Promise.all(
    Array.from({ length: 20 }, () => call('/auth/otp/verify', { phone: PHONE, code, purpose: 'guest_loyalty' })),
  );
  const wrong = guesses.filter((result) => result.status === 401);
  const blocked = guesses.filter((result) => result.status === 429);
  assert.equal(wrong.length, 5);
  assert.equal(blocked.length, 15);
  const [row] = await db.select().from(otpCodes);
  assert.equal(row?.attempts, 5);
});

test('one code can be redeemed only once, even from parallel requests', async () => {
  const { call, ask, codeIn } = await setup();
  await ask();
  const code = codeIn();
  const guesses = await Promise.all(
    Array.from({ length: 8 }, () => call('/auth/otp/verify', { phone: PHONE, code, purpose: 'guest_loyalty' })),
  );
  assert.equal(guesses.filter((result) => result.status === 200).length, 1);
  assert.ok(guesses.every((result) => result.status === 200 || result.status === 401 || result.status === 429));
});

test('parallel texts to one phone still wait 30 seconds, and one address cannot slip past 10 an hour', async () => {
  const { ask, texts } = await setup();
  const samePhone = await Promise.all(Array.from({ length: 8 }, () => ask(PHONE, '7.7.7.7')));
  assert.equal(samePhone.filter((result) => result.status === 202).length, 1);
  assert.equal(texts.length, 1);

  const burst = await Promise.all(
    Array.from({ length: 15 }, (_, i) => ask(`+2332500000${String(i).padStart(2, '0')}`, '8.8.4.4')),
  );
  assert.equal(burst.filter((result) => result.status === 202).length, 10);
  assert.equal(texts.length, 11);
});

test('a full venue bucket does not pause texts for another venue or for guests with no session', async () => {
  const { ask, texts, guest } = await setup(2);
  await ask('+233200000001', '1.1.1.1', guest('ven_a'));
  await ask('+233200000002', '1.1.1.2', guest('ven_a'));
  assert.equal((await ask('+233200000003', '1.1.1.3', guest('ven_a'))).json.code, 'sms_busy');
  assert.equal((await ask('+233200000004', '1.1.1.4', guest('ven_b'))).status, 202);
  await ask('+233200000005', '1.1.1.5');
  await ask('+233200000006', '1.1.1.6', 'Bearer not-a-guest-token');
  assert.equal((await ask('+233200000007', '1.1.1.7')).json.code, 'sms_busy');
  assert.equal(texts.length, 5);
});

test('fifteen wrong guesses lock the phone for an hour, then a new code works again', async () => {
  const { call, ask, tick, codeIn } = await setup();
  const phone = '+233271111111';
  const verify = () => call('/auth/otp/verify', { phone, code: wrongCode(codeIn()), purpose: 'guest_loyalty' });
  for (let round = 0; round < 3; round += 1) {
    if (round > 0) tick(31_000);
    assert.equal((await ask(phone, '9.9.1.1')).status, 202);
    for (let i = 0; i < 5; i += 1) assert.equal((await verify()).status, 401);
  }
  tick(31_000);
  assert.equal((await ask(phone, '9.9.1.1')).status, 429);
  assert.equal((await verify()).status, 429);
  tick(60 * 60_000);
  assert.equal((await ask(phone, '9.9.1.1')).status, 202);
  assert.equal((await call('/auth/otp/verify', { phone, code: codeIn(), purpose: 'guest_loyalty' })).status, 200);
});

test('verify itself is rate limited per phone', async () => {
  const { call } = await setup();
  const body = { phone: PHONE, code: '123456', purpose: 'guest_loyalty' };
  for (let i = 0; i < 30; i += 1) assert.equal((await call('/auth/otp/verify', body)).status, 401);
  assert.equal((await call('/auth/otp/verify', body)).status, 429);
});

test('a text that fails to send does not use up the resend gap or the daily cap', async () => {
  let down = true;
  const { ask, texts } = await setup(2, async (to, text) => {
    if (down) throw new Error('sms down');
    texts.push({ to, text });
  });
  const failed = await ask('+233200000001', '3.3.3.1');
  assert.equal(failed.status, 503);
  assert.equal(failed.json.code, 'sms_unavailable');
  down = false;
  assert.equal((await ask('+233200000001', '3.3.3.1')).status, 202);
  assert.equal((await ask('+233200000002', '3.3.3.2')).status, 202);
  assert.equal((await ask('+233200000003', '3.3.3.3')).json.code, 'sms_busy');
  assert.equal(texts.length, 2);
});

test('a code sent before a phone row exists can still be checked', async () => {
  const { call, ask, codeIn, db } = await setup();
  await ask();
  await db.delete(otpPhoneLimits);
  const wrong = await call('/auth/otp/verify', { phone: PHONE, code: wrongCode(codeIn()), purpose: 'guest_loyalty' });
  assert.equal(wrong.status, 401);
  const again = await setup();
  await again.ask();
  await again.db.delete(otpPhoneLimits);
  assert.equal((await again.call('/auth/otp/verify', { phone: PHONE, code: again.codeIn(), purpose: 'guest_loyalty' })).status, 200);
});

test('requests with no venue share one daily cap, and a bad number never reaches the SMS provider', async () => {
  const { ask, texts } = await setup(2);
  await ask('+233200000001', '1.1.1.1');
  await ask('+233200000002', '1.1.1.2');
  assert.equal((await ask('+233200000003', '1.1.1.3')).json.code, 'sms_busy');
  assert.equal((await ask('0241234567', '1.1.1.4')).status, 400);
  assert.equal(texts.length, 2);
});
