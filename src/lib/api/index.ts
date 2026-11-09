import { createMockClient, sandboxBridge } from '@/mocks/mockClient';
import type { ApiClient } from './client';
import { env } from '../env';
import { createHttpClient } from './http';

let guestToken: string | null = null;
let accessToken: string | null = null;
let loyaltyToken: string | null = null;

export function setGuestToken(token: string | null): void {
  guestToken = token;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function setLoyaltyToken(token: string | null): void {
  loyaltyToken = token;
}

const tokens = {
  guest: () => guestToken,
  access: () => accessToken,
  loyalty: () => loyaltyToken,
};

const mock = createMockClient({
  latencyMs: env.EXPO_PUBLIC_MOCK_LATENCY_MS,
  failRate: env.EXPO_PUBLIC_MOCK_FAIL_RATE,
  fast: env.EXPO_PUBLIC_MOCK_FAST === '1',
  tokens,
});

const http = createHttpClient(env.EXPO_PUBLIC_API_URL, tokens);

/**
 * Phase 2b (EXPO_PUBLIC_API_LIVE=payments): the three payment calls go to the Paystack sandbox
 * server in server/, everything else stays on the mock. The bill lives in the mock, so we send the
 * server what the quote says, and put a payment the server calls succeeded on the mock order.
 */
function withLivePayments(base: ApiClient): ApiClient {
  if (!env.live.includes('payments')) return base;
  return {
    ...base,
    initializePayment: async (body, call) => {
      const quote = JSON.stringify(sandboxBridge.quote(body.quoteId));
      const payment = await http.initializePayment(body, { ...call, sandboxQuote: btoa(quote) });
      return sandboxBridge.track(payment);
    },
    getPayment: async (reference) => sandboxBridge.track(await http.getPayment(reference)),
    verifyPayment: async (reference) => sandboxBridge.track(await http.verifyPayment(reference)),
  };
}

export const api: ApiClient = env.EXPO_PUBLIC_API_MODE === 'http' ? http : withLivePayments(mock);

export { ApiError, OfflineError, toMessageKey } from './errors';
export type { ApiClient } from './client';
