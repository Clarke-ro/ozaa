import { getClerkInstance } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { ApiError } from '@/lib/api/errors';
import type { ClerkLike } from './clerkOwnerAuth';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Clerk, once it has loaded. OwnerClerkProvider (around the owner pages) starts it; this waits up
 * to 10 s for it. Only real-server builds import this file (src/lib/api/index.ts).
 */
export async function loadClerk(publishableKey: string): Promise<ClerkLike> {
  for (let i = 0; i < 200; i += 1) {
    const clerk = getClerkInstance({ publishableKey, tokenCache });
    if (clerk?.loaded) return clerk as unknown as ClerkLike;
    await wait(50);
  }
  throw new ApiError(503, 'auth_unavailable', 'Sign-in is not answering. Try again.');
}
