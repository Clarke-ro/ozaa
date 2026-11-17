import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { Hono } from 'hono';
import { and, count, desc, eq, gte, isNull, lt } from 'drizzle-orm';
import { z } from 'zod';
import type { Db } from '../db/client.ts';
import { otpCodes } from '../db/schema.ts';
import { LOYALTY_TTL_MS, signLoyaltyToken } from '../guest/loyaltyToken.ts';
import { body, Problem } from '../http/problem.ts';
import type { Log } from '../log.ts';
import type { SmsSender } from '../sms/arkesel.ts';

const CODE_TTL_MS = 5 * 60_000;
const RESEND_MS = 30_000;
// Each SMS costs money and anyone can ask for one, so the caps are tight.
const PER_PHONE_PER_HOUR = 5;
const PER_IP_PER_HOUR = 10;
const MAX_TRIES = 5;

export type OtpDeps = {
  db: Db;
  now: () => number;
  /** Hashes phones and codes (the guest token secret), so the table holds neither. */
  hashSecret: string;
  /** Seals loyalty tokens (the server's encryption key). */
  loyaltyKey: Buffer;
  sms: SmsSender | null;
  /** The most codes sent in a day across Cravins: a fuse against a run on SMS costs. */
  dailyLimit: number;
  log: Log;
};

const request = z.object({ phone: z.string().regex(/^\+233\d{9}$/), purpose: z.literal('guest_loyalty') });
const verify = request.extend({ code: z.string().regex(/^\d{6}$/) });

/** Guest phone codes for loyalty (api/openapi.yaml auth/otp). Staff sign in with Clerk. */
export function otpRoutes(deps: OtpDeps) {
  const app = new Hono();
  const { db } = deps;
  const hash = (text: string) => createHmac('sha256', deps.hashSecret).update(text).digest('hex');
  // Per-IP counts live in memory: one Basic dyno serves every request. A restart clears them.
  const byIp = new Map<string, number[]>();
  const limited = (code: string, seconds: number) => new Problem(429, code, `Too many tries. Wait ${seconds} seconds and try again.`);

  app.post('/auth/otp/request', async (c) => {
    const input = await body(c, request);
    const now = deps.now();
    if (!deps.sms) throw new Problem(503, 'sms_not_ready', 'Texts are not set up on this server yet.');
    // Heroku's router adds the caller's address last; earlier entries can be faked.
    const ip = c.req.header('x-forwarded-for')?.split(',').at(-1)?.trim() ?? 'unknown';
    // Forget addresses with nothing in the last hour, so the map doesn't grow for ever.
    if (byIp.size > 5_000) for (const [key, times] of byIp) if (times.every((t) => t <= now - 3_600_000)) byIp.delete(key);
    const recent = (byIp.get(ip) ?? []).filter((t) => t > now - 3_600_000);
    if (recent.length >= PER_IP_PER_HOUR) throw limited('rate_limited', 3600);

    const phoneHash = hash(input.phone);
    const [last] = await db.select().from(otpCodes).where(eq(otpCodes.phoneHash, phoneHash)).orderBy(desc(otpCodes.sentAt)).limit(1);
    if (last && last.sentAt.getTime() > now - RESEND_MS) throw limited('resend_too_soon', 30);
    const [{ n: hourCount } = { n: 0 }] = await db.select({ n: count() }).from(otpCodes).where(and(eq(otpCodes.phoneHash, phoneHash), gte(otpCodes.sentAt, new Date(now - 3_600_000))));
    if (hourCount >= PER_PHONE_PER_HOUR) throw limited('rate_limited', 3600);
    const [{ n: dayCount } = { n: 0 }] = await db.select({ n: count() }).from(otpCodes).where(gte(otpCodes.sentAt, new Date(now - 86_400_000)));
    if (dayCount >= deps.dailyLimit) {
      deps.log({ event: 'otp_daily_limit' });
      throw new Problem(503, 'sms_busy', 'Texts are paused for now. Try again later.');
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await deps.sms(input.phone, `${code} is your Cravins code. It expires in 5 minutes. Don't share it.`);
    await db.insert(otpCodes).values({
      id: `otp_${crypto.randomUUID().replaceAll('-', '')}`,
      phoneHash,
      codeHash: hash(`${phoneHash}:${code}`),
      sentAt: new Date(now),
      expiresAt: new Date(now + CODE_TTL_MS),
    });
    byIp.set(ip, [...recent, now]);
    // Expired codes are useless; a day later they no longer count toward any limit either.
    await db.delete(otpCodes).where(lt(otpCodes.expiresAt, new Date(now - 86_400_000)));
    // Same answer for every number: nobody can use this to find out who is a member.
    return c.json({ expiresInSeconds: CODE_TTL_MS / 1000, resendInSeconds: RESEND_MS / 1000 }, 202);
  });

  app.post('/auth/otp/verify', async (c) => {
    const input = await body(c, verify);
    const now = deps.now();
    const phoneHash = hash(input.phone);
    const [row] = await db
      .select()
      .from(otpCodes)
      .where(and(eq(otpCodes.phoneHash, phoneHash), isNull(otpCodes.usedAt), gte(otpCodes.expiresAt, new Date(now))))
      .orderBy(desc(otpCodes.sentAt))
      .limit(1);
    const wrong = new Problem(401, 'bad_code', 'That code didn’t work. Check it, or ask for a new one.');
    if (!row) throw wrong;
    if (row.attempts >= MAX_TRIES) throw limited('rate_limited', 300);
    const given = Buffer.from(hash(`${phoneHash}:${input.code}`));
    if (!timingSafeEqual(given, Buffer.from(row.codeHash))) {
      await db.update(otpCodes).set({ attempts: row.attempts + 1 }).where(eq(otpCodes.id, row.id));
      throw wrong;
    }
    // One use only: a code can't sign in twice.
    await db.update(otpCodes).set({ usedAt: new Date(now) }).where(eq(otpCodes.id, row.id));
    const exp = now + LOYALTY_TTL_MS;
    return c.json({ accessToken: signLoyaltyToken(deps.loyaltyKey, input.phone, exp), expiresAt: new Date(exp).toISOString() });
  });

  return app;
}
