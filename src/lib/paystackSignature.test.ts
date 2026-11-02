import { signPaystackBody, verifyPaystackSignature } from './paystackSignature';

test('a matching Paystack signature is accepted and a wrong one is not', async () => {
  const body = JSON.stringify({ event: 'charge.success', data: { amount: 14300, currency: 'GHS' } });
  const signature = await signPaystackBody(body, 'sk_test_example');
  expect(await verifyPaystackSignature(body, signature, 'sk_test_example')).toBe(true);
  expect(await verifyPaystackSignature(body, signature, 'sk_test_other')).toBe(false);
  expect(await verifyPaystackSignature(body + ' ', signature, 'sk_test_example')).toBe(false);
});
