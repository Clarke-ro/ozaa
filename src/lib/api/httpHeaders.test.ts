import { createHttpClient } from './http';

// The real-server client, with fetch replaced so each request's headers can be read.
function clientWith(tokens: { guest: string | null; access: string | null; loyalty: string | null }) {
  const sent: Headers[] = [];
  global.fetch = jest.fn(async (input: Request) => {
    sent.push(input.headers);
    return new Response(JSON.stringify({ rank: 1, stampEarned: false }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as unknown as typeof fetch;
  const api = createHttpClient('https://api.example.com/v1', {
    guest: () => tokens.guest,
    access: () => tokens.access,
    loyalty: () => tokens.loyalty,
  });
  return { api, sent };
}

const score = { score: 12, runId: '7b0f7f6e-1d1a-4c3e-9b1a-1a2b3c4d5e6f', durationMs: 60_000 };

test('a game score goes with the guest token, and the loyalty token beside it when there is one', async () => {
  const { api, sent } = clientWith({ guest: 'gst.a', access: 'owner', loyalty: 'lty.b' });
  await api.submitScore('mamas-kitchen', score);
  expect(sent[0]?.get('Authorization')).toBe('Bearer gst.a');
  expect(sent[0]?.get('X-Loyalty-Token')).toBe('lty.b');
});

test('without a loyalty card the score still goes with the guest token, never the owner token', async () => {
  const { api, sent } = clientWith({ guest: 'gst.a', access: 'owner', loyalty: null });
  await api.submitScore('mamas-kitchen', score);
  expect(sent[0]?.get('Authorization')).toBe('Bearer gst.a');
  expect(sent[0]?.has('X-Loyalty-Token')).toBe(false);
});

test('an order carries the loyalty token beside the guest token, so paying for it can stamp the card', async () => {
  const { api, sent } = clientWith({ guest: 'gst.a', access: 'owner', loyalty: 'lty.b' });
  await api
    .createOrder({ clientOrderId: '7b0f7f6e-1d1a-4c3e-9b1a-1a2b3c4d5e6f', lines: [] }, { idempotencyKey: 'k1' })
    .catch(() => undefined);
  expect(sent[0]?.get('Authorization')).toBe('Bearer gst.a');
  expect(sent[0]?.get('X-Loyalty-Token')).toBe('lty.b');
  expect(sent[0]?.get('Idempotency-Key')).toBe('k1');
});
