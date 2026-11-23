import { createHttpClient } from './http';
import { OfflineError } from './errors';

// A request that never reaches the server (no signal) is "offline", so the guest reads
// "You're offline. Connect and try again." instead of "Something went wrong".
const api = () =>
  createHttpClient('https://api.example.com/v1', {
    guest: () => 'gst.a',
    access: () => null,
    loyalty: () => null,
  });

const setOnline = (onLine: boolean) =>
  Object.defineProperty(globalThis, 'navigator', { value: { onLine }, configurable: true });

beforeEach(() => {
  global.fetch = jest.fn(async () => {
    throw new TypeError('Failed to fetch');
  }) as unknown as typeof fetch;
});

test('a request that fails while the phone has no connection is an OfflineError', async () => {
  setOnline(false);
  await expect(api().getVenue('mamas-kitchen')).rejects.toBeInstanceOf(OfflineError);
});

test('with a connection, a failed request is not blamed on the phone', async () => {
  setOnline(true);
  await expect(api().getVenue('mamas-kitchen')).rejects.not.toBeInstanceOf(OfflineError);
});
