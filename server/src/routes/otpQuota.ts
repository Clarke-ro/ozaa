import { and, eq, isNull, lte, or, sql } from 'drizzle-orm';
import type { Db } from '../db/client.ts';
import { otpPhoneLimits, otpSendBuckets } from '../db/schema.ts';
import { Problem } from '../http/problem.ts';

export const HOUR_MS = 3_600_000;
export const DAY_MS = 86_400_000;
export const RESEND_MS = 30_000;
export const PER_PHONE_PER_HOUR = 5;
export const MAX_TRIES = 5;
/**
 * Five wrong tries burn one code. Two more codes can still be wrong before the phone locks,
 * so a mistyped code and a second text still leave a way in.
 */
export const FAILS_BEFORE_LOCK = 15;

const UNSCOPED = 'unscoped';

type PhoneRow = typeof otpPhoneLimits.$inferSelect;

function at(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function limited(code: 'rate_limited' | 'resend_too_soon', seconds: number): Problem {
  return new Problem(429, code, `Too many tries. Wait ${seconds} seconds and try again.`);
}

/** A guest session counts against its venue. Anything else shares one bucket. */
export function sendBucket(venueId: string | null): string {
  return venueId ? `venue:${venueId}` : UNSCOPED;
}

/** Why a reservation was refused, in the same order the route used to check. */
export function explainSendBlock(row: PhoneRow, now: number): Problem {
  if (row.lockedUntil && at(row.lockedUntil).getTime() > now) {
    const seconds = Math.max(1, Math.ceil((at(row.lockedUntil).getTime() - now) / 1000));
    return limited('rate_limited', seconds);
  }
  const last = row.sentAt.at(-1);
  if (last && at(last).getTime() > now - RESEND_MS) return limited('resend_too_soon', 30);
  return limited('rate_limited', 3600);
}

/**
 * Reserves one text for this phone, or null when the row is locked, inside the 30 second
 * resend gap, or already has 5 in the rolling hour. The update rechecks the row, so parallel
 * requests cannot all read "zero" and each take a slot.
 */
export async function reservePhone(db: Db, phoneHash: string, now: number): Promise<Date | null> {
  const nowDate = new Date(now);
  const hourAgo = new Date(now - HOUR_MS);
  const resendAgo = new Date(now - RESEND_MS);
  const rows = await db
    .insert(otpPhoneLimits)
    .values({ phoneHash, sentAt: [nowDate], failCount: 0, failWindowStartedAt: nowDate })
    .onConflictDoUpdate({
      target: otpPhoneLimits.phoneHash,
      set: {
        sentAt: sql`array_append(array(select t from unnest(${otpPhoneLimits.sentAt}) as t where t > ${hourAgo}), ${nowDate})`,
      },
      setWhere: and(
        or(isNull(otpPhoneLimits.lockedUntil), lte(otpPhoneLimits.lockedUntil, nowDate)),
        sql`(cardinality(${otpPhoneLimits.sentAt}) = 0 or ${otpPhoneLimits.sentAt}[cardinality(${otpPhoneLimits.sentAt})] <= ${resendAgo})`,
        sql`(select count(*) from unnest(${otpPhoneLimits.sentAt}) as t where t > ${hourAgo}) < ${PER_PHONE_PER_HOUR}`,
      ),
    })
    .returning({ sentAt: otpPhoneLimits.sentAt });
  const last = rows[0]?.sentAt.at(-1);
  return last ? at(last) : null;
}

/** Puts back a reservation when the text was not sent. Leaves a newer reservation alone. */
export async function undoPhone(db: Db, phoneHash: string, sentAt: Date): Promise<void> {
  await db
    .update(otpPhoneLimits)
    .set({ sentAt: sql`${otpPhoneLimits.sentAt}[1:greatest(cardinality(${otpPhoneLimits.sentAt}) - 1, 0)]` })
    .where(
      and(
        eq(otpPhoneLimits.phoneHash, phoneHash),
        sql`cardinality(${otpPhoneLimits.sentAt}) > 0 and ${otpPhoneLimits.sentAt}[cardinality(${otpPhoneLimits.sentAt})] = ${sentAt}`,
      ),
    );
}

/** Reserves one text in a venue's rolling day, or null when that bucket is full. */
export async function reserveBucket(db: Db, bucket: string, now: number, limit: number): Promise<Date | null> {
  const nowDate = new Date(now);
  const dayAgo = new Date(now - DAY_MS);
  const rows = await db
    .insert(otpSendBuckets)
    .values({ bucket, sentAt: [nowDate] })
    .onConflictDoUpdate({
      target: otpSendBuckets.bucket,
      set: {
        sentAt: sql`array_append(array(select t from unnest(${otpSendBuckets.sentAt}) as t where t > ${dayAgo}), ${nowDate})`,
      },
      setWhere: sql`(select count(*) from unnest(${otpSendBuckets.sentAt}) as t where t > ${dayAgo}) < ${limit}`,
    })
    .returning({ sentAt: otpSendBuckets.sentAt });
  const last = rows[0]?.sentAt.at(-1);
  return last ? at(last) : null;
}

export async function undoBucket(db: Db, bucket: string, sentAt: Date): Promise<void> {
  await db
    .update(otpSendBuckets)
    .set({ sentAt: sql`${otpSendBuckets.sentAt}[1:greatest(cardinality(${otpSendBuckets.sentAt}) - 1, 0)]` })
    .where(
      and(
        eq(otpSendBuckets.bucket, bucket),
        sql`cardinality(${otpSendBuckets.sentAt}) > 0 and ${otpSendBuckets.sentAt}[cardinality(${otpSendBuckets.sentAt})] = ${sentAt}`,
      ),
    );
}

export async function phoneLimitRow(db: Db, phoneHash: string) {
  const [row] = await db.select().from(otpPhoneLimits).where(eq(otpPhoneLimits.phoneHash, phoneHash));
  return row;
}

/** Seconds left on a lock, or null when this phone can still try. */
export async function phoneLockedSeconds(db: Db, phoneHash: string, now: number): Promise<number | null> {
  const row = await phoneLimitRow(db, phoneHash);
  if (!row?.lockedUntil) return null;
  const until = at(row.lockedUntil).getTime();
  if (until <= now) return null;
  return Math.max(1, Math.ceil((until - now) / 1000));
}

/** Counts a wrong guess. Fifteen in an hour locks the phone for the next hour. */
export async function noteWrongGuess(db: Db, phoneHash: string, now: number): Promise<void> {
  const nowDate = new Date(now);
  const hourAgo = new Date(now - HOUR_MS);
  const lockUntil = new Date(now + HOUR_MS);
  await db
    .insert(otpPhoneLimits)
    .values({ phoneHash, sentAt: [], failCount: 1, failWindowStartedAt: nowDate })
    .onConflictDoUpdate({
      target: otpPhoneLimits.phoneHash,
      set: {
        failWindowStartedAt: sql`case when ${otpPhoneLimits.failWindowStartedAt} <= ${hourAgo} then ${nowDate} else ${otpPhoneLimits.failWindowStartedAt} end`,
        failCount: sql`case when ${otpPhoneLimits.failWindowStartedAt} <= ${hourAgo} then 1 else ${otpPhoneLimits.failCount} + 1 end`,
        lockedUntil: sql`case when (case when ${otpPhoneLimits.failWindowStartedAt} <= ${hourAgo} then 1 else ${otpPhoneLimits.failCount} + 1 end) >= ${FAILS_BEFORE_LOCK} then ${lockUntil} else ${otpPhoneLimits.lockedUntil} end`,
      },
    });
}
