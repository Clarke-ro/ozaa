import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PaystackError, paystackClient } from './paystack.ts';

test('Paystack is given up on when it does not answer', async () => {
  const client = paystackClient('sk_test_x', (async () => {
    const error = new Error('timed out');
    error.name = 'TimeoutError';
    throw error;
  }) as typeof fetch);
  await assert.rejects(
    client.checkKey(),
    (error: unknown) => error instanceof PaystackError && error.httpStatus === 503,
  );
});
