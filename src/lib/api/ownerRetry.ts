import type { ApiClient } from './client';
import { ApiError } from './errors';

/** Gets a new owner access token. True means there is one now and the call can be tried again. */
export type OnUnauthorized = () => Promise<boolean>;

// Calls that send the owner or staff token (ownerAuth in api/openapi.yaml). `logout` is left out:
// a 401 there means the token is already gone, which is what logging out wanted.
const OWNER_TOKEN_CALLS = new Set(['getMe', 'deleteAccount']);
const usesOwnerToken = (name: string) => name.startsWith('owner') || OWNER_TOKEN_CALLS.has(name);

/**
 * Owner access tokens expire after an hour. When an owner call comes back 401, ask for a new token
 * once and try the call once more, so the owner doesn't have to sign in again every hour.
 * `handler` is read on each 401, so the session can plug itself in after the API is built.
 */
export function withOwnerRetry(base: ApiClient, handler: () => OnUnauthorized | null): ApiClient {
  const wrapped = { ...base } as Record<string, unknown>;
  for (const [name, value] of Object.entries(base)) {
    if (typeof value !== 'function' || !usesOwnerToken(name)) continue;
    const call = value as (...args: unknown[]) => Promise<unknown>;
    wrapped[name] = async (...args: unknown[]) => {
      try {
        return await call(...args);
      } catch (error) {
        const onUnauthorized = handler();
        if (!(error instanceof ApiError) || error.status !== 401 || !onUnauthorized) throw error;
        if (!(await onUnauthorized())) throw error;
        return call(...args);
      }
    };
  }
  return wrapped as ApiClient;
}
