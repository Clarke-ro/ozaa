import type { ApiClient } from './client';
import { ApiError } from './errors';

/** Starts a new guest session for the same venue and table. True means the call can be tried again. */
export type OnGuestUnauthorized = () => Promise<boolean>;

// Guest calls that start something new. A fresh session can safely send these again: the
// Idempotency-Key still stops a second order. Reading an old order or bill isn't here, because a
// new session can't see the old visit's order anyway.
const RENEWABLE = new Set([
  'createOrder',
  'callWaiter',
  'createReview',
  'submitScore',
  'sendFeedback',
]);

/**
 * Guests never sign in, so they must never see "unauthorized". Their session token runs out
 * (4 hours on the server), and in the demo a page reload forgets it. When one of the calls above
 * comes back 401, start a new session for the same table once and try again.
 */
export function withGuestRetry(
  base: ApiClient,
  handler: () => OnGuestUnauthorized | null,
): ApiClient {
  const wrapped = { ...base } as Record<string, unknown>;
  for (const [name, value] of Object.entries(base)) {
    if (typeof value !== 'function' || !RENEWABLE.has(name)) continue;
    const call = value as (...args: unknown[]) => Promise<unknown>;
    wrapped[name] = async (...args: unknown[]) => {
      try {
        return await call(...args);
      } catch (error) {
        const renew = handler();
        if (!(error instanceof ApiError) || error.status !== 401 || !renew) throw error;
        if (!(await renew().catch(() => false))) throw error;
        return call(...args);
      }
    };
  }
  return wrapped as ApiClient;
}
