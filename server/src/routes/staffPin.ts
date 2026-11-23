import { Hono } from 'hono';
import { and, eq, isNotNull, lt, ne, sql } from 'drizzle-orm';
import { z } from 'zod';
import { staffMemberships, staffUsers } from '../db/schema.ts';
import { body, Problem } from '../http/problem.ts';
import { clientIp, slidingWindow } from '../http/rateLimit.ts';
import type { ClerkAdmin } from '../owner/clerkAdmin.ts';
import { checkPin, hashPin } from '../owner/pinHash.ts';
import { signedIn, type OwnerDeps } from '../owner/staff.ts';

// Contract (loginWithPin): five wrong PINs in a row clear the PIN.
const MAX_TRIES = 5;
// One address trying PINs against many numbers. Each number has its own five tries; this stops
// a script walking a list of staff phones. A shared Wi-Fi of staff signing in stays well under.
const LOGINS_PER_IP = 30;
const LOGIN_WINDOW_MS = 10 * 60_000;

const pin = z.string().regex(/^[0-9]{4}$/);
const deviceId = z.string().min(1).max(200);
const setBody = z.object({ pin, deviceId });
const loginBody = z.object({ phone: z.string().regex(/^\+233[0-9]{9}$/), pin, deviceId });

/** Quick staff sign-in with a 4-digit PIN on a device that already signed in by code (api/openapi.yaml auth/pin). */
export function staffPinRoutes(deps: OwnerDeps & { clerkAdmin: ClerkAdmin | null }) {
  const app = new Hono();
  const { db } = deps;
  const perIp = slidingWindow({ limit: LOGINS_PER_IP, windowMs: LOGIN_WINDOW_MS, now: deps.now });
  // The same answer for every refusal, so the screen never says which numbers belong to staff.
  const refused = () =>
    new Problem(401, 'pin_refused', 'That PIN didn’t work. Sign in with a code instead.');

  app.put('/auth/pin', async (c) => {
    const who = await signedIn(c, deps);
    const input = await body(c, setBody);
    await db
      .update(staffUsers)
      .set({ pinHash: await hashPin(input.pin), pinDeviceId: input.deviceId, pinFails: 0 })
      .where(eq(staffUsers.id, who.user.id));
    return c.body(null, 204);
  });

  app.post('/auth/pin/login', async (c) => {
    if (!perIp.hit(clientIp(c.req.header('x-forwarded-for')))) {
      throw new Problem(429, 'rate_limited', 'Too many tries. Wait a few minutes and try again.');
    }
    const input = await body(c, loginBody);
    if (!deps.clerkAdmin)
      throw new Problem(503, 'sign_in_not_ready', 'Sign-in is not set up on this server yet.');

    // Take one of the five tries before comparing, in one update. Guesses sent all at once each
    // need their own try, so a burst can't compare more than five times (the race #200 fixed for
    // phone codes). A wrong device matches nothing, so it never uses up someone's tries.
    const [taken] = await db
      .update(staffUsers)
      .set({ pinFails: sql`${staffUsers.pinFails} + 1` })
      .where(
        and(
          eq(staffUsers.phone, input.phone),
          eq(staffUsers.pinDeviceId, input.deviceId),
          isNotNull(staffUsers.pinHash),
          isNotNull(staffUsers.clerkUserId),
          lt(staffUsers.pinFails, MAX_TRIES),
        ),
      )
      .returning();
    if (!taken?.pinHash || !taken.clerkUserId) throw refused();

    if (!(await checkPin(input.pin, taken.pinHash))) {
      // The fifth miss clears the PIN: next time it's the code, then a new PIN.
      if (taken.pinFails >= MAX_TRIES) {
        await db
          .update(staffUsers)
          .set({ pinHash: null, pinDeviceId: null, pinFails: 0 })
          .where(eq(staffUsers.id, taken.id));
      }
      throw refused();
    }
    await db.update(staffUsers).set({ pinFails: 0 }).where(eq(staffUsers.id, taken.id));
    // Someone removed from every team keeps nothing a PIN could open.
    const [member] = await db
      .select({ id: staffMemberships.id })
      .from(staffMemberships)
      .where(and(eq(staffMemberships.userId, taken.id), ne(staffMemberships.status, 'removed')))
      .limit(1);
    if (!member) throw refused();
    return c.json({ signInToken: await deps.clerkAdmin.signInToken(taken.clerkUserId) });
  });

  return app;
}
