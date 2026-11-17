import { Hono, type Context } from 'hono';
import { and, eq, ne } from 'drizzle-orm';
import { z } from 'zod';
import { staffMemberships, staffUsers } from '../db/schema.ts';
import { body, Problem } from '../http/problem.ts';
import type { ClerkAdmin } from '../owner/clerkAdmin.ts';
import { roleAt, ROLES, signedIn, type OwnerDeps } from '../owner/staff.ts';
import type { StaffMember } from '../shared/types.ts';
import { venueRowById } from '../venues/venueData.ts';

type MembershipRow = typeof staffMemberships.$inferSelect;
type UserRow = typeof staffUsers.$inferSelect;

// Anyone but an owner: a second owner could change where the money goes, so that stays a
// support step (the app's invite form leaves "owner" out for the same reason).
const ROLE = z.enum(['manager', 'waiter', 'kitchen', 'viewer', 'staff_scanner']);
const inviteBody = z.object({
  phone: z.string().regex(/^\+233\d{9}$/),
  email: z.email().max(254).optional(),
  firstName: z.string().trim().min(1).max(40),
  role: ROLE,
});
const updateBody = z
  .object({ role: ROLE, tableCodes: z.array(z.string().max(12)).max(200) })
  .partial()
  .refine((u) => u.role !== undefined || u.tableCodes !== undefined, 'Send a role or tables.');

/** 024 *** 4567: enough for the owner to tell people apart, without showing the number. */
const masked = (phone: string) => `0${phone.slice(4, 6)} *** ${phone.slice(-4)}`;

function memberOf(m: MembershipRow, u: UserRow): StaffMember {
  return {
    id: m.id,
    firstName: u.firstName,
    ...(u.lastName ? { lastName: u.lastName } : {}),
    role: m.role,
    phoneMasked: masked(u.phone),
    status: m.status,
    ...(m.joinedAt ? { joinedAt: m.joinedAt.toISOString() } : {}),
    lastActiveAt: m.lastActiveAt?.toISOString() ?? null,
    hasPin: u.pinHash !== null,
  } as StaffMember;
}

/** Staff (api/openapi.yaml owner staff). Owner only: who works here is the owner's call. */
export function ownerStaffRoutes(deps: OwnerDeps & { clerkAdmin: ClerkAdmin | null }) {
  const app = new Hono();
  const { db } = deps;

  const ownerAt = async (c: Context) => {
    const venueId = c.req.param('venueId') ?? '';
    roleAt(await signedIn(c, deps), venueId, ROLES.payments);
    await venueRowById(db, venueId);
    return venueId;
  };

  app.get('/owner/venues/:venueId/staff', async (c) => {
    const venueId = await ownerAt(c);
    const rows = await db
      .select()
      .from(staffMemberships)
      .innerJoin(staffUsers, eq(staffUsers.id, staffMemberships.userId))
      .where(and(eq(staffMemberships.venueId, venueId), ne(staffMemberships.status, 'removed')));
    return c.json({ items: rows.map((r) => memberOf(r.staff_memberships, r.staff_users)) });
  });

  /**
   * Invites someone: their staff record (found by phone, or made now), a membership here, and a
   * Clerk sign-in for their email so they can sign in straight away. Re-inviting someone who was
   * removed brings them back.
   */
  app.post('/owner/venues/:venueId/staff', async (c) => {
    const who = await signedIn(c, deps);
    const venueId = c.req.param('venueId') ?? '';
    roleAt(who, venueId, ROLES.payments);
    await venueRowById(db, venueId);
    const input = await body(c, inviteBody);
    const email = input.email?.toLowerCase() ?? null;
    let [user] = await db.select().from(staffUsers).where(eq(staffUsers.phone, input.phone));
    if (email) {
      const [sameEmail] = await db.select().from(staffUsers).where(eq(staffUsers.email, email));
      if (sameEmail && sameEmail.id !== user?.id) {
        throw new Problem(409, 'email_taken', 'Someone else on Cravins signs in with that email.');
      }
    }
    if (!user) {
      [user] = await db
        .insert(staffUsers)
        .values({ id: `usr_${crypto.randomUUID().replaceAll('-', '')}`, phone: input.phone, email, firstName: input.firstName })
        .returning();
    } else if (email && !user.email) {
      // The email becomes their sign-in. Another venue's owner must not be able to put their own
      // email on someone's account and sign in as them, so it is only added for a person with no
      // sign-in yet who works nowhere but the inviting owner's venues.
      const theirs = await db
        .select({ venueId: staffMemberships.venueId })
        .from(staffMemberships)
        .where(and(eq(staffMemberships.userId, user.id), ne(staffMemberships.status, 'removed')));
      const owned = new Set(who.memberships.filter((m) => m.role === 'owner').map((m) => m.venueId));
      if (user.clerkUserId || theirs.some((m) => !owned.has(m.venueId))) {
        throw new Problem(409, 'email_not_yours', 'That number already has a Cravins account. Invite them without an email; they add it themselves.');
      }
      [user] = await db.update(staffUsers).set({ email }).where(eq(staffUsers.id, user.id)).returning();
    }
    user = user!;
    const [current] = await db
      .select()
      .from(staffMemberships)
      .where(and(eq(staffMemberships.venueId, venueId), eq(staffMemberships.userId, user.id)));
    if (current && current.status !== 'removed') throw new Problem(409, 'already_staff', 'They are already on your team.');

    // Their Clerk sign-in, made before the membership so a Clerk failure leaves nothing half done.
    if (user.email && !user.clerkUserId) {
      if (!deps.clerkAdmin) throw new Problem(503, 'sign_in_not_ready', 'Sign-in is not set up on this server yet.');
      const clerkUserId = await deps.clerkAdmin.ensureUser({ email: user.email, firstName: user.firstName });
      [user] = await db.update(staffUsers).set({ clerkUserId }).where(eq(staffUsers.id, user.id)).returning();
      user = user!;
    }
    const values = { role: input.role, status: 'invited' as const, tableCodes: [], joinedAt: null, lastActiveAt: null };
    const [member] = current
      ? await db.update(staffMemberships).set(values).where(eq(staffMemberships.id, current.id)).returning()
      : await db
          .insert(staffMemberships)
          .values({ id: `mem_${crypto.randomUUID().replaceAll('-', '')}`, venueId, userId: user.id, ...values })
          .returning();
    return c.json(memberOf(member!, user), 201);
  });

  /** A teammate at this venue, never the owner (whose role and access only support changes). */
  const teammate = async (c: Context, venueId: string) => {
    const [row] = await db
      .select()
      .from(staffMemberships)
      .innerJoin(staffUsers, eq(staffUsers.id, staffMemberships.userId))
      .where(and(eq(staffMemberships.id, c.req.param('staffId') ?? ''), eq(staffMemberships.venueId, venueId), ne(staffMemberships.status, 'removed')));
    if (!row) throw new Problem(404, 'not_found', 'That person is not on your team.');
    return row;
  };
  const notOwner = (m: MembershipRow, code: string, detail: string) => {
    if (m.role === 'owner') throw new Problem(409, code, detail);
  };

  app.patch('/owner/venues/:venueId/staff/:staffId', async (c) => {
    const venueId = await ownerAt(c);
    const row = await teammate(c, venueId);
    notOwner(row.staff_memberships, 'owner_role', "The owner's role can't be changed.");
    const input = updateBody.safeParse(await c.req.json().catch(() => null));
    if (!input.success) throw new Problem(400, 'validation', 'Send a role or tables.');
    const [member] = await db.update(staffMemberships).set(input.data).where(eq(staffMemberships.id, row.staff_memberships.id)).returning();
    return c.json(memberOf(member!, row.staff_users));
  });

  /** Removes them from this venue and signs them out everywhere. Other venues keep them. */
  app.delete('/owner/venues/:venueId/staff/:staffId', async (c) => {
    const venueId = await ownerAt(c);
    const row = await teammate(c, venueId);
    notOwner(row.staff_memberships, 'owner_role', "The owner can't be removed.");
    await db.update(staffMemberships).set({ status: 'removed' }).where(eq(staffMemberships.id, row.staff_memberships.id));
    await signOutEverywhere(deps.clerkAdmin, row.staff_users);
    return c.body(null, 204);
  });

  app.post('/owner/venues/:venueId/staff/:staffId/reset-pin', async (c) => {
    const venueId = await ownerAt(c);
    const row = await teammate(c, venueId);
    await db.update(staffUsers).set({ pinHash: null, pinDeviceId: null, pinFails: 0 }).where(eq(staffUsers.id, row.staff_users.id));
    return c.body(null, 204);
  });

  app.post('/owner/venues/:venueId/staff/:staffId/sign-out', async (c) => {
    const venueId = await ownerAt(c);
    const row = await teammate(c, venueId);
    notOwner(row.staff_memberships, 'owner_sign_out', 'The owner signs out in Settings.');
    await signOutEverywhere(deps.clerkAdmin, row.staff_users);
    return c.body(null, 204);
  });

  return app;
}

async function signOutEverywhere(admin: ClerkAdmin | null, user: UserRow) {
  if (admin && user.clerkUserId) await admin.revokeSessions(user.clerkUserId);
}

