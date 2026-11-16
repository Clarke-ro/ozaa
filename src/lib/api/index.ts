import type { ApiClient } from './client';
import { onlineManager } from '@tanstack/react-query';
import { env } from '../env';
import { createHttpClient } from './http';
import { withOwnerRetry, type OnUnauthorized } from './ownerRetry';
import { withGuestRetry, type OnGuestUnauthorized } from './guestRetry';
import { notReadyAuth, type OwnerAuth } from '../auth/ownerAuth';
import { clerkOwnerAuth } from '../auth/clerkOwnerAuth';

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
  // The owner's changes stay on this device across reloads (src/mocks/demoMemory.ts).
  remember: true,
});

const base: ApiClient = mock ? mock.api : http;

let onGuestUnauthorized: OnGuestUnauthorized | null = null;

/** The guest session plugs in here: how to start a new one when the old one has run out. */
export function setOnGuestUnauthorized(handler: OnGuestUnauthorized | null): void {
  onGuestUnauthorized = handler;
}

export const api: ApiClient = withOwnerRetry(
  withGuestRetry(base, () => onGuestUnauthorized),
  () => onUnauthorized,
);

// Clerk's code is fetched the first time someone uses owner sign-in (a dynamic import, which the
// web build splits into its own file), so guest pages never download it. In a mock build the
// branch below is dead code and Clerk is left out entirely.
const loadClerk = (key: string) =>
  import('../auth/loadClerk').then((module) => module.loadClerk(key));

/**
 * Owner and staff sign-in (src/lib/auth/ownerAuth.ts): the mock's stand-in in mock builds, Clerk
 * in real-server builds. Without a Clerk key, sign-in says it isn't set up.
 */
export const ownerAuth: OwnerAuth =
  mock?.auth ??
  (process.env.EXPO_PUBLIC_API_MODE === 'http' && env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY
    ? clerkOwnerAuth(() => loadClerk(env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY))
    : notReadyAuth);

export { ApiError, OfflineError, toMessageKey } from './errors';
export type { ApiClient } from './client';
