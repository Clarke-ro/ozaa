import type { ApiClient } from './client';
import { onlineManager } from '@tanstack/react-query';
import { env } from '../env';
import { createHttpClient } from './http';
import { withOwnerRetry, type OnUnauthorized } from './ownerRetry';
import { withGuestRetry, type OnGuestUnauthorized } from './guestRetry';
import { notReadyAuth, type OwnerAuth } from '../auth/ownerAuth';

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

// The mock (demo venues, photos, fixtures) loads only in a mock build. Expo writes
// EXPO_PUBLIC_API_MODE into the bundle, so for a real-server build ("http") this branch is dead
// code and the whole mock is left out of what guests download. It must be spelled out in full here.
const mocks =
  process.env.EXPO_PUBLIC_API_MODE === 'http'
    ? null
    : // eslint-disable-next-line @typescript-eslint/no-require-imports -- see the note above
      (require('@/mocks/mockClient') as typeof import('@/mocks/mockClient'));

const http = createHttpClient(env.EXPO_PUBLIC_API_URL, tokens);

/**
 * Phase 2b (EXPO_PUBLIC_API_LIVE=payments): the three payment calls go to the Paystack sandbox
 * server in server/, everything else stays on the mock. The bill lives in the mock, so we send the
 * server what the quote says, and put a payment the server calls succeeded on the mock order.
 */
function withLivePayments(base: ApiClient): ApiClient {
  if (!env.live.includes('payments') || !mocks) return base;
  const { sandboxBridge } = mocks;
  return {
    ...base,
    initializePayment: async (body, call) => {
      const quote = JSON.stringify(sandboxBridge.quote(body.quoteId));
      const payment = await http.initializePayment(body, { ...call, sandboxQuote: btoa(quote) });
      return sandboxBridge.track(payment, body.quoteId);
    },
    getPayment: async (reference) => sandboxBridge.track(await http.getPayment(reference)),
    verifyPayment: async (reference) => sandboxBridge.track(await http.verifyPayment(reference)),
  };
}

let onUnauthorized: OnUnauthorized | null = null;

/** The owner session plugs in here: how to get a new access token when one expires. */
export function setOnUnauthorized(handler: OnUnauthorized | null): void {
  onUnauthorized = handler;
}

const mock = mocks?.createMockApi({
  latencyMs: env.EXPO_PUBLIC_MOCK_LATENCY_MS,
  failRate: env.EXPO_PUBLIC_MOCK_FAIL_RATE,
  fast: env.EXPO_PUBLIC_MOCK_FAST === '1',
  tokens,
  // Lets the demo go offline like a real phone, so the offline screens can be tried and tested.
  isOnline: () => onlineManager.isOnline(),
});

const base: ApiClient = mock ? withLivePayments(mock.api) : http;

let onGuestUnauthorized: OnGuestUnauthorized | null = null;

/** The guest session plugs in here: how to start a new one when the old one has run out. */
export function setOnGuestUnauthorized(handler: OnGuestUnauthorized | null): void {
  onGuestUnauthorized = handler;
}

export const api: ApiClient = withOwnerRetry(
  withGuestRetry(base, () => onGuestUnauthorized),
  () => onUnauthorized,
);

/**
 * Owner and staff sign-in (src/lib/auth/ownerAuth.ts). The mock's stand-in shares the mock's world;
 * real-server builds get Clerk in the next PR and say "not set up" until then.
 */
export const ownerAuth: OwnerAuth = mock?.auth ?? notReadyAuth;

export { ApiError, OfflineError, toMessageKey } from './errors';
export type { ApiClient } from './client';
