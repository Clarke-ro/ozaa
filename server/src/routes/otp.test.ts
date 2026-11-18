import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.ts';
import { expectContract } from '../contract/contract.ts';
import { testDb } from '../db/testDb.ts';
import { readLoyaltyToken } from '../guest/loyaltyToken.ts';
import type { PaymentService } from '../payments.ts';
import { TEST_KEY } from './testHelpers.ts';

const PHONE = '+233241234567';

async function setup(dailyLimit = 300) {
  const db = await testDb();
  let clock = Date.parse('2026-11-17T12:00:00Z');
  const texts: { to: string; text: string }[] = [];
  const app = createApp({
    payments: {} as PaymentService,
    otp: {
      db,
      now: () => clock,
      hashSecret: 'x'.repeat(32),
      loyaltyKey: TEST_KEY,
      sms: async (to, text) => void texts.push({ to, text }),
      dailyLimit,
      ipPerHour: 10,
    },
    allowedOrigins: [],
    log: () => undefined,
    ping: async () => undefined,
  });
  const call = async (path: string, body: unknown, ip = '1.2.3.4') => {
    const res = await app.request(`/v1${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': `9.9.9.9, ${ip}` },
      body: JSON.stringify(body),
    });
    return { status: res.status, json: await res.json().catch(() => null) };
  };
  const ask = (phone = PHONE, ip?: string) =>
    call('/auth/otp/request', { phone, purpose: 'guest_loyalty' }, ip);
  const codeIn = (i = -1) => texts.at(i)!.text.slice(0, 6);
  return { db, call, ask, texts, codeIn, tick: (ms: number) => (clock += ms), now: () => clock };
}

test('a code by SMS, once, proves the phone; the token holds the number sealed', async () => {
  const { call, ask, texts, codeIn, now } = await setup();
  const sent = await ask();
  expectContract('requestOtp', 202, sent.json);
  assert.equal(texts[0]!.to, PHONE);
  const wrong = await call('/auth/otp/verify', {
    phone: PHONE,
    code: codeIn() === '000000' ? '111111' : '000000',
    purpose: 'guest_loyalty',
  });
  expectContract('verifyOtp', 401, wrong.json);
  const ok = await call('/auth/otp/verify', {
    phone: PHONE,
    code: codeIn(),
    purpose: 'guest_loyalty',
  });
  expectContract('verifyOtp', 200, ok.json);
  assert.ok(!ok.json.accessToken.includes('241234567'));
  assert.equal(readLoyaltyToken(TEST_KEY, ok.json.accessToken, now()), PHONE);
  // The same code can't be used twice.
  assert.equal(
    (await call('/auth/otp/verify', { phone: PHONE, code: codeIn(), purpose: 'guest_loyalty' }))
      .status,
    401,
  );
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
  for (let i = 0; i < 5; i += 1)
    await call('/auth/otp/verify', {
      phone: '+233270000000',
      code: '999999',
      purpose: 'guest_loyalty',
    });
  assert.equal(
    (
      await call('/auth/otp/verify', {
        phone: '+233270000000',
        code: '999999',
        purpose: 'guest_loyalty',
      })
    ).status,
    429,
  );
});

test('a daily cap pauses all texts, and a bad number never reaches the SMS provider', async () => {
  const { ask, texts } = await setup(2);
  await ask('+233200000001', '1.1.1.1');
  await ask('+233200000002', '1.1.1.2');
  assert.equal((await ask('+233200000003', '1.1.1.3')).json.code, 'sms_busy');
  assert.equal((await ask('0241234567', '1.1.1.4')).status, 400);
  assert.equal(texts.length, 2);
});
