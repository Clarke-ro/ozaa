import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fromPaystack } from './status.ts';

const expected = { amountPesewas: 14_300, currency: 'GHS' as const };

test('success with the same amount and currency is the only way to succeeded', () => {
  assert.deepEqual(
    fromPaystack({ status: 'success', amount: 14_300, currency: 'GHS' }, expected, 'pay_offline'),
    { status: 'succeeded' },
  );
});

test('success with a different amount or currency is not paid', () => {
  assert.deepEqual(
    fromPaystack({ status: 'success', amount: 100, currency: 'GHS' }, expected, 'pay_offline'),
    { status: 'failed', failureReason: 'amount_mismatch' },
  );
  assert.deepEqual(
    fromPaystack({ status: 'success', amount: 14_300, currency: 'NGN' }, expected, 'open_url'),
    { status: 'failed', failureReason: 'amount_mismatch' },
  );
});

test('failed keeps the reason Paystack gave, abandoned stays abandoned', () => {
  assert.deepEqual(
    fromPaystack(
      { status: 'failed', amount: 14_300, currency: 'GHS', gateway_response: 'Insufficient funds' },
      expected,
      'pay_offline',
    ),
    { status: 'failed', failureReason: 'Insufficient funds' },
  );
  assert.deepEqual(
    fromPaystack({ status: 'abandoned', amount: 14_300, currency: 'GHS' }, expected, 'open_url'),
    { status: 'abandoned' },
  );
});

test('anything still in progress keeps the status we already had', () => {
  for (const status of ['ongoing', 'pending', 'processing', 'queued', 'send_otp', 'pay_offline']) {
    assert.deepEqual(
      fromPaystack({ status, amount: 14_300, currency: 'GHS' }, expected, 'pay_offline'),
      { status: 'pay_offline' },
    );
  }
});
