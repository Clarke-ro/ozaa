import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { Hono } from 'hono';
import { and, desc, eq, gte, isNull, lt, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { Db } from '../db/client.ts';
import { otpCodes } from '../db/schema.ts';
import { LOYALTY_TTL_MS, signLoyaltyToken } from '../guest/loyaltyToken.ts';
import { readGuestToken } from '../guest/token.ts';
import { body, Problem } from '../http/problem.ts';
import { clientIp, slidingWindow } from '../http/rateLimit.ts';
import type { Log } from '../log.ts';
import type { SmsSender } from '../sms/arkesel.ts';
import {
  DAY_MS,
  explainSendBlock,
  MAX_TRIES,
  noteWrongGuess,
  phoneLimitRow,
  phoneLockedSeconds,
  reserveBucket,
  reservePhone,
  RESEND_MS,
  sendBucket,
  undoBucket,
  undoPhone,
} from './otpQuota.ts';

const CODE_TTL_MS = 5 * 60_000;
// A venue's Wi-Fi, or a mobile network, is one address for many phones. The per-phone and per-venue
// caps are what stop a run on SMS cost. This address cap only stops one address flooding.
const PER_IP_PER_HOUR = 1_000;
// A person tries a code a few times. These stop a burst of guesses, not a busy dining room.
const VERIFY_PER_PHONE_PER_MINUTE = 30;
const VERIFY_PER_IP_PER_MINUTE = 60;

export type OtpDeps = {
  db: Db;
  now: () => number;
  /** Hashes phones and codes (the guest token secret), so the table holds neither. */
  hashSecret: string;
  /** Reads the optional guest session on a text request. The secret that signs guest tokens. */
  guestSecret: string;
  /** Seals loyalty tokens (the server's encryption key). */
  loyaltyKey: Buffer;
  sms: SmsSender | null;
  /** Texts one venue may send per rolling day. No session shares a separate bucket of this size. */
  dailyLimit: number;
  /** Tests pass a small address cap. Production uses PER_IP_PER_HOUR. */
  ipPerHour?: number;
  log: Log;
};

const request = z.object({ phone: z.string().regex(/^\+233\d{9}$/), purpose: z.literal('guest_loyalty') });
const verifyBody = request.extend({ code: z.string().regex(/^\d{6}$/) });

function sameHash(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  // Hashes are fixed length. A mismatch would throw, and a thrown compare is not a wrong code.
  return a.length === b.length && timingSafeEqual(a, b);
}

function venueOf(secret: string, authorization: string | undefined, now: number): string | null {
  const token = authorization?.startsWith('Bearer ') ? authorization.slice('Bearer '.length) : undefined;
  return readGuestToken(secret, token, now)?.venueId ?? null;
}

/** Guest phone codes for loyalty (api/openapi.yaml auth/otp). Staff sign in with Clerk. */
export function otpRoutes(deps: OtpDeps) {
  const app = new Hono();
  const { db } = deps;
  const hash = (text: string) => createHmac('sha256', deps.hashSecret).update(text).digest('hex');
  // Per-IP counts live in memory: one dyno serves every request. A restart clears them.
  const sendsByIp = slidingWindow({ limit: deps.ipPerHour ?? PER_IP_PER_HOUR, windowMs: 60 * 60_000, now: deps.now });
  const verifyByIp = slidingWindow({ limit: VERIFY_PER_IP_PER_MINUTE, windowMs: 60_000, now: deps.now });
  const verifyByPhone = slidingWindow({ limit: VERIFY_PER_PHONE_PER_MINUTE, windowMs: 60_000, now: deps.now });
  const limited = (code: 'rate_limited' | 'resend_too_soon', seconds: number) =>
    new Problem(429, code, `Too many tries. Wait ${seconds} seconds and try again.`);
  const wrong = new Problem(401, 'bad_code', 'That code didn’t work. Check it, or ask for a new one.');

  app.post('/auth/otp/request', async (c) => {
    const input = await body(c, request);
    const now = deps.now();
    if (!deps.sms) throw new Problem(503, 'sms_not_ready', 'Texts are not set up on this server yet.');
    const ip = clientIp(c.req.header('x-forwarded-for'));
    if (!sendsByIp.hit(ip)) throw limited('rate_limited', 3600);

    const phoneHash = hash(input.phone);
    const bucket = sendBucket(venueOf(deps.guestSecret, c.req.header('authorization'), now));
    let phoneStamp: Date | null = null;
    let bucketStamp: Date | null = null;
    let codeId: string | null = null;
    try {
      phoneStamp = await reservePhone(db, phoneHash, now);
      if (!phoneStamp) {
        const row = await phoneLimitRow(db, phoneHash);
        throw row ? explainSendBlock(row, now) : limited('rate_limited', 3600);
      }
      bucketStamp = await reserveBucket(db, bucket, now, deps.dailyLimit);
      if (!bucketStamp) {
        deps.log({ event: 'otp_daily_limit', bucket });
        throw new Problem(503, 'sms_busy', 'Texts are paused for now. Try again later.');
      }

      const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
      codeId = `otp_${crypto.randomUUID().replaceAll('-', '')}`;
      await db.insert(otpCodes).values({
        id: codeId,
        phoneHash,
        codeHash: hash(`${phoneHash}:${code}`),
        sentAt: new Date(now),
        expiresAt: new Date(now + CODE_TTL_MS),
      });
      try {
        await deps.sms(input.phone, `${code} is your Cravins code. It expires in 5 minutes. Don't share it.`);
      } catch {
        // The SMS provider failed or timed out. The guest can try again; it's not a server bug.
        throw new Problem(503, 'sms_unavailable', 'The text could not be sent. Try again in a moment.');
      }
    } catch (error) {
      sendsByIp.drop(ip);
      // The text did not go out, so the code and the reserved slots must not stand.
      try {
        if (codeId) await db.delete(otpCodes).where(eq(otpCodes.id, codeId));
        if (bucketStamp) await undoBucket(db, bucket, bucketStamp);
        if (phoneStamp) await undoPhone(db, phoneHash, phoneStamp);
      } catch {
        // The guest still hears the original problem.
      }
      throw error;
    }
    // Expired codes are useless; a day later they no longer matter to anyone reading the table.
    // A failed tidy-up must not turn a text that was sent into an error.
    await db.delete(otpCodes).where(lt(otpCodes.expiresAt, new Date(now - DAY_MS))).catch(() => undefined);
    return c.json({ expiresInSeconds: CODE_TTL_MS / 1000, resendInSeconds: RESEND_MS / 1000 }, 202);
  });

  app.post('/auth/otp/verify', async (c) => {
    const input = await body(c, verifyBody);
    const now = deps.now();
    const ip = clientIp(c.req.header('x-forwarded-for'));
    if (!verifyByIp.hit(ip)) throw limited('rate_limited', 60);
    const phoneHash = hash(input.phone);
    if (!verifyByPhone.hit(phoneHash)) throw limited('rate_limited', 60);

    const lockedFor = await phoneLockedSeconds(db, phoneHash, now);
    if (lockedFor) throw limited('rate_limited', lockedFor);

    const [row] = await db
      .select()
      .from(otpCodes)
      .where(and(eq(otpCodes.phoneHash, phoneHash), isNull(otpCodes.usedAt), gte(otpCodes.expiresAt, new Date(now))))
      .orderBy(desc(otpCodes.sentAt))
      .limit(1);
    if (!row) throw wrong;
    if (row.attempts >= MAX_TRIES) throw limited('rate_limited', 300);

    // One statement, rechecked under the row lock: parallel guesses cannot all pass.
    const [taken] = await db
      .update(otpCodes)
      .set({ attempts: sql`${otpCodes.attempts} + 1` })
      .where(and(eq(otpCodes.id, row.id), isNull(otpCodes.usedAt), lt(otpCodes.attempts, MAX_TRIES)))
      .returning({ id: otpCodes.id, codeHash: otpCodes.codeHash });
    if (!taken) throw limited('rate_limited', 300);

    if (!sameHash(hash(`${phoneHash}:${input.code}`), taken.codeHash)) {
      await noteWrongGuess(db, phoneHash, now);
      throw wrong;
    }

    // One use only, and only one of a parallel pair can take it.
    const [used] = await db
      .update(otpCodes)
      .set({ usedAt: new Date(now) })
      .where(and(eq(otpCodes.id, taken.id), isNull(otpCodes.usedAt)))
      .returning({ id: otpCodes.id });
    if (!used) throw wrong;

    const exp = now + LOYALTY_TTL_MS;
    return c.json({ accessToken: signLoyaltyToken(deps.loyaltyKey, input.phone, exp), expiresAt: new Date(exp).toISOString() });
  });

  return app;
}
