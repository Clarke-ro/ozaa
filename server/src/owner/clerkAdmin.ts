import { createClerkClient } from '@clerk/backend';

/** The Clerk calls staff management needs. Tests pass a fake with the same shape. */
export type ClerkAdmin = {
  /** The Clerk user for this email, made now if there isn't one. Returns its Clerk user id. */
  ensureUser(input: { email: string; firstName: string }): Promise<string>;
  /** Signs them out on every device: each active session is revoked. */
  revokeSessions(clerkUserId: string): Promise<void>;
};

/**
 * Real Clerk, with the server's secret key. Users are made with their email only: Clerk can't
 * text Ghana numbers yet, and adding a +233 number to a Clerk user is refused while it can't.
 * The email counts as verified because the owner who invited them vouches for it, the same way
 * the first owner was set up (BUILD.md section 4).
 */
export function clerkAdmin(secretKey: string): ClerkAdmin {
  const clerk = createClerkClient({ secretKey });
  return {
    async ensureUser({ email, firstName }) {
      const found = await clerk.users.getUserList({ emailAddress: [email], limit: 1 });
      const existing = found.data[0];
      if (existing) return existing.id;
      const made = await clerk.users.createUser({ emailAddress: [email], firstName, skipPasswordRequirement: true });
      return made.id;
    },
    async revokeSessions(clerkUserId) {
      const sessions = await clerk.sessions.getSessionList({ userId: clerkUserId, status: 'active' });
      await Promise.all(sessions.data.map((session) => clerk.sessions.revokeSession(session.id)));
    },
  };
}
