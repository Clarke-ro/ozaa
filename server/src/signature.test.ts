import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { isFromPaystack } from './signature.ts';

const secret = 'sk_test_example';
const body = JSON.stringify({ event: 'charge.success', data: { reference: 'pay_1' } });
const signed = createHmac('sha512', secret).update(body).digest('hex');

test('a body signed with our secret key is from Paystack', () => {
  assert.equal(isFromPaystack(body, signed, secret), true);
});

test('a changed body, a wrong key or a missing signature is refused', () => {
  assert.equal(isFromPaystack(body.replace('pay_1', 'pay_2'), signed, secret), false);
  assert.equal(isFromPaystack(body, signed, 'sk_test_other'), false);
  assert.equal(isFromPaystack(body, undefined, secret), false);
  assert.equal(isFromPaystack(body, 'not-hex', secret), false);
});
