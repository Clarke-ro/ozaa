import { useEffect } from 'react';
import { ownerAuth } from '@/lib/api';
import { useOwnerSession } from './sessionStore';

// Clerk's token lasts about 60 s. Asking every 50 s keeps a live one ready, so owner screens that
// poll don't each fail once a minute and retry (src/lib/api/ownerRetry.ts still covers a miss).
const EVERY_MS = 50_000;

/** While someone is signed in, keeps the token the API sends fresh. */
export function useFreshOwnerToken(): void {
  const signedIn = useOwnerSession((state) => Boolean(state.accessToken));
  useEffect(() => {
    if (!signedIn) return;
    const timer = setInterval(() => {
      ownerAuth
        .getToken()
        .then((token) => {
          if (token) useOwnerSession.getState().saveToken(token);
        })
        // Offline or Clerk slow: keep the old token; the retry on 401 handles it.
        .catch(() => undefined);
    }, EVERY_MS);
    return () => clearInterval(timer);
  }, [signedIn]);
}
