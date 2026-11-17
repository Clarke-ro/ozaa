import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { media, staffUsers } from '../db/schema.ts';
import { body, Problem } from '../http/problem.ts';
import { imageFor } from '../media/images.ts';
import type { MediaStorage } from '../media/storage.ts';
import type { ClerkAdmin } from '../owner/clerkAdmin.ts';
import { meOf, prefsOf, signedIn, type OwnerDeps } from '../owner/staff.ts';

const profileBody = z
  .object({
    firstName: z.string().trim().min(1).max(40),
    lastName: z.string().trim().max(40).nullish(),
    email: z.email().nullish(),
    photoMediaId: z.string().min(1).nullish(),
    prefs: z.record(z.string(), z.unknown()),
  })
  .partial()
  .refine((p) => Object.keys(p).length > 0, 'Send a change.');

/** The signed-in person's own profile and account (api/openapi.yaml /me/profile, /auth/account). */
export function meRoutes(deps: OwnerDeps & { storage: MediaStorage | null; clerkAdmin: ClerkAdmin | null }) {
  const app = new Hono();
  const { db } = deps;

  app.patch('/me/profile', async (c) => {
    const who = await signedIn(c, deps);
    const input = profileBody.safeParse(await c.req.json().catch(() => null));
    if (!input.success) {
      const email = input.error.issues.some((i) => i.path[0] === 'email');
      throw new Problem(422, email ? 'email_not_valid' : 'validation', email ? 'Check the email address.' : 'Check your details.');
    }
    const { photoMediaId, ...fields } = input.data;
    let photo: unknown;
    if (photoMediaId === null) photo = null;
    else if (photoMediaId) {
      // A profile photo is uploaded through one of their venues, so it must belong to one of them.
      const [row] = await db.select({ venueId: media.venueId }).from(media).where(eq(media.id, photoMediaId));
      if (!row || !who.memberships.some((m) => m.venueId === row.venueId)) throw new Problem(422, 'media_not_found', 'That photo did not finish uploading.');
      photo = await imageFor(db, deps.storage, row.venueId, photoMediaId);
    }
    const [user] = await db
      .update(staffUsers)
      .set({
        ...(fields.firstName ? { firstName: fields.firstName } : {}),
        ...(fields.lastName !== undefined ? { lastName: fields.lastName } : {}),
        ...(fields.email !== undefined ? { email: fields.email?.toLowerCase() ?? null } : {}),
        // Saving one switch keeps the others (notify merges too).
        ...(fields.prefs ? { prefs: prefsOf({ ...prefsOf(who.user.prefs), ...fields.prefs, notify: { ...prefsOf(who.user.prefs).notify, ...((fields.prefs.notify as object) ?? {}) } }) } : {}),
        ...(photo !== undefined ? { photo } : {}),
      })
      .where(eq(staffUsers.id, who.user.id))
      .returning();
    return c.json(await meOf(db, { ...who, user: user! }));
  });

  /**
   * Deleting an account removes the person's Clerk sign-in, their place on every team and their
   * details. An owner's account also holds venues, money settings and other people's jobs, so that
   * isn't done automatically: it goes through support, who keep the 6 years of tax records.
   */
  app.delete('/auth/account', async (c) => {
    const who = await signedIn(c, deps);
    const input = await body(c, z.object({ confirmText: z.string() }));
    if (input.confirmText.trim().toUpperCase() !== 'DELETE MY ACCOUNT') throw new Problem(400, 'confirm_text', 'Type DELETE MY ACCOUNT to confirm.');
    if (who.memberships.some((m) => m.role === 'owner')) {
      throw new Problem(409, 'owner_has_venues', 'Owners close their account through Cravins support, so venues and tax records are handled properly.');
    }
    if (who.user.clerkUserId && deps.clerkAdmin) await deps.clerkAdmin.deleteUser(who.user.clerkUserId);
    // Their memberships and read marks go with the row (cascade). Orders they handled keep no link.
    await db.delete(staffUsers).where(eq(staffUsers.id, who.user.id));
    return c.body(null, 204);
  });

  return app;
}
