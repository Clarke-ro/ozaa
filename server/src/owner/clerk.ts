import { createClerkClient, verifyToken } from '@clerk/backend';

/** Who Clerk says is calling: their Clerk user id and the email and phone Clerk has verified. */
export type ClerkIdentity = {
  clerkUserId: string;
  email: string | null;
  phone: string | null;
  firstName: string | null;
};

/** Checks an owner app's bearer token. Null means "not signed in" (expired, forged, wrong app). */
export type VerifyOwner = (token: string) => Promise<ClerkIdentity | null>;

// Clerk's session token doesn't carry the email or phone, so we ask Clerk's API for the user. A short
// cache keeps that to about one lookup a minute per person while the app polls every few seconds.
const USER_CACHE_MS = 60_000;

/**
 * The real check, with Clerk's backend SDK: the signature (Clerk's public key), the expiry, and
 * that the token was made for one of our own sites (`authorizedParties`, Clerk's `azp`).
 */
export function clerkVerifier(options: { secretKey: string; authorizedParties: string[] }): VerifyOwner {
  const clerk = createClerkClient({ secretKey: options.secretKey });
  const cache = new Map<string, { identity: ClerkIdentity; until: number }>();
  return async (token) => {
    let userId: string;
    try {
      const claims = await verifyToken(token, {
        secretKey: options.secretKey,
        authorizedParties: options.authorizedParties,
      });
      userId = claims.sub;
    } catch {
      return null;
    }
    const hit = cache.get(userId);
    if (hit && hit.until > Date.now()) return hit.identity;
    const user = await clerk.users.getUser(userId);
    // Only an address Clerk has verified with a code counts: that's what proves who this is.
    const email =
      user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId && e.verification?.status === 'verified') ??
      user.emailAddresses.find((e) => e.verification?.status === 'verified');
    const phone =
      user.phoneNumbers.find((p) => p.id === user.primaryPhoneNumberId && p.verification?.status === 'verified') ??
      user.phoneNumbers.find((p) => p.verification?.status === 'verified');
    const identity = {
      clerkUserId: userId,
      email: email?.emailAddress.toLowerCase() ?? null,
      phone: phone?.phoneNumber ?? null,
      firstName: user.firstName,
    };
    cache.set(userId, { identity, until: Date.now() + USER_CACHE_MS });
    return identity;
  };
}
