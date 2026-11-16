import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLog } from './log.ts';

function capture() {
  const lines: string[] = [];
  const log = createLog((line) => lines.push(line), () => Date.parse('2026-11-16T10:00:00Z'));
  return { log, read: () => lines.map((l) => JSON.parse(l) as Record<string, unknown>) };
}

test('writes one JSON line per event, with the time', () => {
  const { log, read } = capture();
  log({ event: 'payment_started', reference: 'pay_123', status: 'pay_offline' });
  assert.deepEqual(read(), [
    { at: '2026-11-16T10:00:00.000Z', event: 'payment_started', reference: 'pay_123', status: 'pay_offline' },
  ]);
});

test('drops fields whose name says they hold personal data or secrets', () => {
  const { log, read } = capture();
  log({ event: 'x', phone: '+233241234567', email: 'a@b.co', secretKey: 'sk_test_abc', otp: '123456', idempotencyKey: 'k1' });
  assert.deepEqual(read()[0], {
    at: '2026-11-16T10:00:00.000Z',
    event: 'x',
    phone: '[removed]',
    email: '[removed]',
    secretKey: '[removed]',
    otp: '[removed]',
    idempotencyKey: '[removed]',
  });
});

test('scrubs phone numbers, emails, keys and tokens that slip into other fields', () => {
  const { log, read } = capture();
  log({
    event: 'x',
    message: 'Charge for +233 24 123 4567 (024 123 4567) by ama@example.com with sk_live_abcDEF123 and Bearer eyJhbGciOi.eyJzdWIi.sig',
  });
  const message = String(read()[0]?.message);
  for (const leaked of ['233', '024', 'ama@example.com', 'sk_live_abcDEF123', 'eyJhbGciOi']) {
    assert.ok(!message.includes(leaked), `${leaked} leaked: ${message}`);
  }
  assert.match(message, /\[phone\].*\[phone\].*\[email\].*\[key\].*\[token\]/);
});

test('keeps references, amounts and statuses as they are', () => {
  const { log, read } = capture();
  log({ event: 'webhook', reference: 'pay_9f8e7d6c5b4a', amountPesewas: 14300, ok: true });
  assert.deepEqual(read()[0], {
    at: '2026-11-16T10:00:00.000Z',
    event: 'webhook',
    reference: 'pay_9f8e7d6c5b4a',
    amountPesewas: 14300,
    ok: true,
  });
});
