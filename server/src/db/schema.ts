import { sql } from 'drizzle-orm';
import { boolean, check, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * Payments started in the app (api/openapi.yaml Payment). One row per Paystack charge.
 * Money is whole pesewas; only Paystack's "success" for the same amount sets status succeeded.
 */
export const payments = pgTable(
  'payments',
  {
    reference: text('reference').primaryKey(),
    // The app's Idempotency-Key. Unique, so a double tap, even one that reaches another copy of
    // the server, finds the first payment instead of charging twice.
    idempotencyKey: text('idempotency_key').notNull().unique(),
    orderId: text('order_id').notNull(),
    venueSlug: text('venue_slug').notNull(),
    method: text('method', { enum: ['momo', 'card'] }).notNull(),
    provider: text('provider', { enum: ['mtn', 'vod', 'atl'] }),
    amountPesewas: integer('amount_pesewas').notNull(),
    tipPesewas: integer('tip_pesewas').notNull().default(0),
    currency: text('currency', { enum: ['GHS'] }).notNull().default('GHS'),
    status: text('status', {
      enum: ['pending', 'pay_offline', 'open_url', 'succeeded', 'failed', 'abandoned'],
    }).notNull(),
    displayText: text('display_text'),
    authorizationUrl: text('authorization_url'),
    approveBy: timestamp('approve_by', { withTimezone: true }),
    failureReason: text('failure_reason'),
    testMode: boolean('test_mode').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    // When we last asked Paystack, so a guest polling every few seconds doesn't flood it.
    lastAskedAt: timestamp('last_asked_at', { withTimezone: true }),
  },
  (t) => [
    check('payments_amount_positive', sql`${t.amountPesewas} > 0`),
    check('payments_tip_not_negative', sql`${t.tipPesewas} >= 0`),
  ],
  // Row Level Security on, with no rules: Supabase's public web API (and its anon key, which ships
  // in apps) can't read or write payments at all. The server connects as the table's owner, which
  // RLS doesn't restrict, so it is unaffected. Every new table gets .enableRLS() too.
).enableRLS();
