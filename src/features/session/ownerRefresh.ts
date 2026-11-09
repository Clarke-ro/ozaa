import { ApiError } from '@/lib/api/errors';
import type { AuthTokens } from '@/lib/api/types';

type Deps = {
  refreshToken: () => string | null;
  refresh: (refreshToken: string) => Promise<AuthTokens>;
  save: (tokens: AuthTokens) => void;
  signOut: () => void;
};

/**
 * Swaps the refresh token for a new access token. Several owner screens poll at once, so when the
 * token expires many calls fail together: they all wait on the same refresh instead of each
 * starting one (a refresh token works only once).
 * A refused refresh token signs the owner out. Being offline doesn't: they can try again later.
 */
export function ownerRefresher(deps: Deps): () => Promise<boolean> {
  let running: Promise<boolean> | null = null;
  const attempt = async (): Promise<boolean> => {
    const refreshToken = deps.refreshToken();
    if (!refreshToken) {
      deps.signOut();
      return false;
    }
    try {
      deps.save(await deps.refresh(refreshToken));
      return true;
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 400)) {
        deps.signOut();
      }
      return false;
    }
  };
  return () => {
    running ??= attempt().finally(() => {
      running = null;
    });
    return running;
  };
}
