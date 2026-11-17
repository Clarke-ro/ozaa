import { and, eq, inArray, isNull, ne } from 'drizzle-orm';
import type { Context } from 'hono';
import type { Db } from '../db/client.ts';
import { staffMemberships, staffUsers, venues } from '../db/schema.ts';
import { Problem } from '../http/problem.ts';
import type { StaffRole, StaffUser } from '../shared/types.ts';
import type { VerifyOwner } from './clerk.ts';

export type OwnerDeps = { db: Db; verify: VerifyOwner | null; now: () => number };

type UserRow = typeof staffUsers.$inferSelect;
type MembershipRow = typeof staffMemberships.$inferSelect;
export type SignedIn = { user: UserRow; memberships: MembershipRow[] };

/**
 * The signed-in staff member, or a Problem. Clerk proves who they are; Cravins decides what they
 * may do. The first sign-in links the Clerk user to the staff record with the same verified email
 * (staff sign in by email code for now, because Clerk won't text Ghana numbers yet) or phone, and
 * turns their invites into active memberships. After that the Clerk user id finds them.
 */
export async function signedIn(c: Context, deps: OwnerDeps): Promise<SignedIn> {
  if (!deps.verify) throw new Problem(503, 'sign_in_not_ready', 'Sign-in is not set up on this server yet.');
  const token = c.req.header('Authorization')?.replace(/^Bearer /, '');
  const identity = token ? await deps.verify(token) : null;
  if (!identity) throw new Problem(401, 'unauthorized', 'Sign in again.');
  const { db } = deps;

  let [user] = await db.select().from(staffUsers).where(eq(staffUsers.clerkUserId, identity.clerkUserId));
  // Only a row no other Clerk user has claimed can be linked.
  if (!user && identity.email) {
    [user] = await db
      .update(staffUsers)
      .set({ clerkUserId: identity.clerkUserId })
      .where(and(eq(staffUsers.email, identity.email), isNull(staffUsers.clerkUserId)))
      .returning();
  }
  if (!user && identity.phone) {
    [user] = await db
      .update(staffUsers)
      .set({ clerkUserId: identity.clerkUserId })
      .where(and(eq(staffUsers.phone, identity.phone), isNull(staffUsers.clerkUserId)))
      .returning();
  }
  if (!user) throw new Problem(403, 'not_staff', 'You are not on a Cravins team. Ask your venue owner for an invite.');
  // Keep the phone in step with Clerk: a number changed in Clerk shows up here on the next call.
  if (identity.phone && identity.phone !== user.phone) {
    [user] = await db.update(staffUsers).set({ phone: identity.phone }).where(eq(staffUsers.id, user.id)).returning();
    if (!user) throw new Problem(401, 'unauthorized', 'Sign in again.');
  }
  const at = new Date(deps.now());
  await db
    .update(staffMemberships)
    .set({ status: 'active', joinedAt: at })
    .where(and(eq(staffMemberships.userId, user.id), eq(staffMemberships.status, 'invited')));
  const memberships = await db
    .update(staffMemberships)
    .set({ lastActiveAt: at })
    .where(and(eq(staffMemberships.userId, user.id), ne(staffMemberships.status, 'removed')))
    .returning();
  if (memberships.length === 0) throw new Problem(403, 'not_staff', 'You are not on any team right now.');
  return { user, memberships };
}

/** GET /me: the person and the venues they can manage. */
export async function meOf(db: Db, who: SignedIn): Promise<StaffUser> {
  const ids = who.memberships.map((m) => m.venueId);
  const names = await db.select({ id: venues.id, name: venues.name }).from(venues).where(inArray(venues.id, ids));
  return {
    id: who.user.id,
    firstName: who.user.firstName,
    lastName: who.user.lastName,
    phone: who.user.phone,
    email: who.user.email,
    photo: (who.user.photo as StaffUser['photo']) ?? null,
    ...(who.user.prefs ? { prefs: who.user.prefs as StaffUser['prefs'] } : {}),
    venues: who.memberships.map((m) => ({
      venueId: m.venueId,
      name: names.find((v) => v.id === m.venueId)?.name ?? '',
      role: m.role,
    })),
  };
}

/**
 * What each role may do (StaffRole in the contract): the owner everything, including payment
 * settings and staff; a manager everything else; waiters orders and waiter calls; kitchen moves
 * orders along. Checked on every /owner call against the venue in the request.
 */
export const ROLES = {
  payments: ['owner'],
  orders: ['owner', 'manager', 'waiter', 'kitchen', 'viewer'],
  markPaid: ['owner', 'manager', 'waiter'],
  moveOrder: ['owner', 'manager', 'waiter', 'kitchen'],
  menu: ['owner', 'manager'],
  // Scanning cards, adding stamps and confirming reward codes at the counter.
  loyaltyDesk: ['owner', 'manager', 'waiter', 'staff_scanner'],
} satisfies Record<string, StaffRole[]>;

/** The caller's role at this venue, if it is one of `allowed`; otherwise 403. */
export function roleAt(who: SignedIn, venueId: string, allowed: StaffRole[]): StaffRole {
  const membership = who.memberships.find((m) => m.venueId === venueId);
  if (!membership || !allowed.includes(membership.role)) {
    throw new Problem(403, 'forbidden', 'Your role can’t do this here.');
  }
  return membership.role;
}
