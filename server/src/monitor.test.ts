import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ErrorEvent } from '@sentry/node';
import { scrub } from './monitor.ts';

test('an error report keeps what went wrong and drops anything about the person or request', () => {
  const event = {
    exception: { values: [{ type: 'TypeError', value: 'x is undefined' }] },
    request: {
      url: 'https://api.test/v1/orders?phone=0241234567',
      headers: { authorization: 'Bearer gst.secret', 'x-loyalty-token': 'lty.secret' },
      cookies: { a: 'b' },
      data: '{"contact":{"name":"Ama","phone":"+233241234567"}}',
      query_string: 'phone=0241234567',
    },
    user: { ip_address: '1.2.3.4', email: 'ama@example.com' },
    breadcrumbs: [{ message: 'fetch https://api.paystack.co/charge' }],
    extra: { body: 'anything' },
  } as unknown as ErrorEvent;
  const out = scrub(event)!;
  const text = JSON.stringify(out);
  for (const leak of ['secret', '0241234567', 'Ama', 'ama@example.com', '1.2.3.4', 'paystack', 'anything']) {
    assert.ok(!text.includes(leak), `report must not contain ${leak}`);
  }
  assert.equal(out.exception?.values?.[0]?.type, 'TypeError');
  // The route is kept without its query, so we know where it happened.
  assert.equal(out.request?.url, 'https://api.test/v1/orders');
});
