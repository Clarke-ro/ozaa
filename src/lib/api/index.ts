import { createMockClient } from '@/mocks/mockClient';
import type { ApiClient } from './client';
import { env } from '../env';
import { createHttpClient } from './http';

let guestToken: string | null = null;
let accessToken: string | null = null;

export function setGuestToken(token: string | null): void {
  guestToken = token;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

const tokens = {
  guest: () => guestToken,
  access: () => accessToken,
};

const mock = createMockClient({
  latencyMs: env.EXPO_PUBLIC_MOCK_LATENCY_MS,
  failRate: env.EXPO_PUBLIC_MOCK_FAIL_RATE,
  fast: env.EXPO_PUBLIC_MOCK_FAST === '1',
  tokens,
});

const http = createHttpClient(env.EXPO_PUBLIC_API_URL, tokens);

function withLivePayments(base: ApiClient): ApiClient {
  if (!env.live.includes('payments')) return base;
  return {
    ...base,
    initializePayment: http.initializePayment,
    getPayment: http.getPayment,
    verifyPayment: http.verifyPayment,
  };
}

export const api: ApiClient = env.EXPO_PUBLIC_API_MODE === 'http' ? http : withLivePayments(mock);

export { ApiError, OfflineError, toMessageKey } from './errors';
export type { ApiClient } from './client';
