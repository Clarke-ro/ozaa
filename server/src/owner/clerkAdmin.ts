import { createClerkClient } from '@clerk/backend';
import { withTimeout } from '../http/outbound.ts';

/** The Clerk calls staff management needs. Tests pass a fake with the same shape. */
export type ClerkAdmin = {
  /** The Clerk user for this email, made now if there isn't one. Returns its Clerk user id. */
  ensureUser(input: { email: string; firstName: string }): Promise<string>;
  /** Signs them out on every device: each active session is revoked. */
  revokeSessions(clerkUserId: string): Promise<void>;
  /** Removes their Clerk sign-in (account deletion). */
  deleteUser(clerkUserId: string): Promise<void>;
  /** A one-time sign-in token (Clerk's `ticket` strategy) for PIN sign-in. Never logged. */
  signInToken(clerkUserId: string): Promise<string>;
};

// Long enough for the app to hand it straight to Clerk; useless soon after (contract: PinSignIn).
const SIGN_IN_TOKEN_SECONDS = 300;

/**
 * Real Clerk, with the server's secret key. Users are made with their email only: Clerk can't
 * text Ghana numbers yet, and adding a +233 number to a Clerk user is refused while it can't.
 * The email counts as verified because the owner who invited them vouches for it, the same way
 * the first owner was set up (BUILD.md section 4).
 */
export function clerkAdmin(secretKey: string, timeoutMs?: number): ClerkAdmin {
  const clerk = createClerkClient({ secretKey });
  const wait = <T>(work: Promise<T>) => withTimeout(work, timeoutMs);
  return {
    async ensureUser({ email, firstName }) {
      const found = await wait(clerk.users.getUserList({ emailAddress: [email], limit: 1 }));
      const existing = found.data[0];
      if (existing) return existing.id;
      const made = await wait(
        clerk.users.createUser({ emailAddress: [email], firstName, skipPasswordRequirement: true }),
      );
      return made.id;
    },
    async revokeSessions(clerkUserId) {
      const sessions = await wait(
        clerk.sessions.getSessionList({ userId: clerkUserId, status: 'active' }),
      );
      await Promise.all(
        sessions.data.map((session) => wait(clerk.sessions.revokeSession(session.id))),
      );
    },
    async deleteUser(clerkUserId) {
      await wait(clerk.users.deleteUser(clerkUserId));
    },
    async signInToken(clerkUserId) {
      const made = await wait(
        clerk.signInTokens.createSignInToken({
          userId: clerkUserId,
          expiresInSeconds: SIGN_IN_TOKEN_SECONDS,
        }),
      );
      return made.token;
    },
  };
}
