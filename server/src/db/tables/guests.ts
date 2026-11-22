import { sql } from 'drizzle-orm';
import { boolean, check, index, integer, jsonb, pgTable, text, timestamp, unique, uniqueIndex } from 'drizzle-orm/pg-core';
import { at } from './columns.ts';
import { venues } from './venues.ts';

/** A venue's loyalty programme (LoyaltyProgram), saved as a whole. Locked after the first earn. */
export const loyaltyPrograms = pgTable('loyalty_programs', {
  venueId: text('venue_id').primaryKey().references(() => venues.id, { onDelete: 'cascade' }),
  programme: jsonb('programme').notNull(),
  updatedAt: at('updated_at').notNull().defaultNow(),
}).enableRLS();

/**
 * A guest in a venue's loyalty programme (LoyaltyMember). The phone is proved by an SMS code and
 * is the only way to find them again. It's shown masked (024 *** 4567) and never logged.
 * Consent is kept with the exact text version they agreed to (Act 843); marketing is separate.
 */
export const loyaltyMembers = pgTable(
  'loyalty_members',
  {
    id: text('id').primaryKey(),
    venueId: text('venue_id').notNull().references(() => venues.id, { onDelete: 'cascade' }),
    phone: text('phone').notNull(),
    firstName: text('first_name'),
    birthdayMonthDay: text('birthday_month_day'),
    marketingConsent: boolean('marketing_consent').notNull().default(false),
    consentAt: at('consent_at').notNull(),
    consentTextVersion: text('consent_text_version').notNull(),
    memberSince: at('member_since').notNull().defaultNow(),
    // Leaving loyalty or being removed blanks the personal fields and sets this.
    leftAt: at('left_at'),
  },
  (t) => [
    unique('loyalty_members_venue_phone').on(t.venueId, t.phone),
    check('loyalty_members_birthday', sql`${t.birthdayMonthDay} is null or ${t.birthdayMonthDay} ~ '^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$'`),
  ],
).enableRLS();

/**
 * The loyalty ledger (LoyaltyFact): earn, claim and confirm, append-only. The balance is always
 * worked out from these rows (src/features/loyalty/facts.ts in the app has the same rules), so
 * no stamp is ever lost or made up by an update.
 */
export const loyaltyFacts = pgTable(
  'loyalty_facts',
  {
    id: text('id').primaryKey(),
    memberId: text('member_id').notNull().references(() => loyaltyMembers.id, { onDelete: 'cascade' }),
    venueId: text('venue_id').notNull().references(() => venues.id, { onDelete: 'cascade' }),
    kind: text('kind', { enum: ['earn', 'claim', 'confirm'] }).notNull(),
    at: at('at').notNull().defaultNow(),
    units: integer('units').notNull(),
    // earn: { source }; claim: { code, rewardId, title, expiresAt }; confirm: { claimId, rewardId, title }.
    details: jsonb('details').notNull(),
    // Who stamped or confirmed it: a staff first name or a scanner device name (scan log).
    by: text('by'),
  },
  (t) => [
    index('loyalty_facts_member').on(t.memberId, t.at),
    // The owner's loyalty screens read a whole venue's facts.
    index('loyalty_facts_venue').on(t.venueId),
    check('loyalty_facts_units', sql`${t.units} >= 0`),
  ],
).enableRLS();

/**
 * SMS codes for guests joining loyalty (POST /auth/otp/*). Only a hash of the phone and of the
 * code is kept, and only until it expires, so a database leak shows no numbers and no codes.
 */
export const otpCodes = pgTable('otp_codes', {
  id: text('id').primaryKey(),
  phoneHash: text('phone_hash').notNull(),
  codeHash: text('code_hash').notNull(),
  attempts: integer('attempts').notNull().default(0),
  sentAt: at('sent_at').notNull().defaultNow(),
  expiresAt: at('expires_at').notNull(),
  usedAt: at('used_at'),
}, (t) => [index('otp_codes_phone').on(t.phoneHash, t.sentAt)]).enableRLS();

/**
 * Per-phone counters for loyalty texts. The row holds hashes and times only, never the number.
 * `sentAt` is the rolling hour of texts we reserved; its length is the hourly cap. A wrong-guess
 * streak lives here too, so a new code cannot reset the lock.
 */
export const otpPhoneLimits = pgTable('otp_phone_limits', {
  phoneHash: text('phone_hash').primaryKey(),
  sentAt: timestamp('sent_at', { withTimezone: true }).array().notNull().default(sql`'{}'::timestamptz[]`),
  failCount: integer('fail_count').notNull().default(0),
  failWindowStartedAt: at('fail_window_started_at').notNull(),
  lockedUntil: at('locked_until'),
}).enableRLS();

/**
 * How many loyalty texts one venue has reserved in the rolling day. Requests with no guest
 * session share the bucket `unscoped`, so they cannot spend another venue's allowance.
 */
export const otpSendBuckets = pgTable('otp_send_buckets', {
  bucket: text('bucket').primaryKey(),
  sentAt: timestamp('sent_at', { withTimezone: true }).array().notNull().default(sql`'{}'::timestamptz[]`),
}).enableRLS();

/** Written reviews (WrittenReview). First name only; no phone. */
export const writtenReviews = pgTable('written_reviews', {
  id: text('id').primaryKey(),
  venueId: text('venue_id').notNull().references(() => venues.id, { onDelete: 'cascade' }),
  orderId: text('order_id'),
  stars: integer('stars').notNull(),
  firstName: text('first_name').notNull(),
  text: text('text'),
  highlights: text('highlights').array().notNull().default(sql`'{}'::text[]`),
  reply: text('reply'),
  createdAt: at('created_at').notNull().defaultNow(),
}, (t) => [
  check('written_reviews_stars', sql`${t.stars} between 1 and 5`),
  index('written_reviews_venue_created').on(t.venueId, t.createdAt),
  // One review per order. Null order ids (notes from before this rule) stay allowed, many of them.
  uniqueIndex('written_reviews_one_order').on(t.orderId).where(sql`${t.orderId} is not null`),
]).enableRLS();

/** Private notes to the manager (FeedbackItem). A phone only if the guest chose to leave one. */
export const feedback = pgTable('feedback', {
  id: text('id').primaryKey(),
  venueId: text('venue_id').notNull().references(() => venues.id, { onDelete: 'cascade' }),
  sentiment: text('sentiment', { enum: ['positive', 'neutral', 'negative'] }).notNull(),
  score: integer('score').notNull(),
  text: text('text').notNull(),
  photoUrl: text('photo_url'),
  contactName: text('contact_name'),
  contactPhone: text('contact_phone'),
  archived: boolean('archived').notNull().default(false),
  visibleAfter: at('visible_after').notNull().defaultNow(),
  createdAt: at('created_at').notNull().defaultNow(),
  // Which visit sent the note, so one session can't fill the manager's list. Not shown to anyone.
  guestSessionId: text('guest_session_id'),
}, (t) => [
  index('feedback_venue_created').on(t.venueId, t.createdAt),
  index('feedback_session').on(t.venueId, t.guestSessionId),
]).enableRLS();

/** Game scores for the weekly leaderboard. runId is unique, so a replayed score counts once. */
export const gameScores = pgTable('game_scores', {
  runId: text('run_id').primaryKey(),
  venueId: text('venue_id').notNull().references(() => venues.id, { onDelete: 'cascade' }),
  guestSessionId: text('guest_session_id').notNull(),
  score: integer('score').notNull(),
  durationMs: integer('duration_ms').notNull(),
  nickname: text('nickname'),
  createdAt: at('created_at').notNull().defaultNow(),
}, (t) => [index('game_scores_week').on(t.venueId, t.createdAt)]).enableRLS();

/** One row per guest session start, for "visitors today" and the Insights funnel. No personal data. */
export const visits = pgTable('visits', {
  id: text('id').primaryKey(),
  venueId: text('venue_id').notNull().references(() => venues.id, { onDelete: 'cascade' }),
  tableCode: text('table_code'),
  source: text('source', { enum: ['table', 'link'] }).notNull(),
  startedAt: at('started_at').notNull().defaultNow(),
}, (t) => [index('visits_venue_day').on(t.venueId, t.startedAt)]).enableRLS();
