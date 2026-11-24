import { sql } from 'drizzle-orm';
import { boolean, check, jsonb, pgTable, text, unique } from 'drizzle-orm/pg-core';
import { at } from './columns.ts';

/**
 * A business (Business in the contract): one owner, one Cravins plan, one or more venues.
 * Contact details here are the business's own, shown on receipts; never a guest's.
 */
export const businesses = pgTable('businesses', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  plan: text('plan', { enum: ['free', 'pro', 'business'] })
    .notNull()
    .default('free'),
  // Business profile fields (description, categories, cuisines, price range, website, TIN…),
  // always read and saved together, so one JSON value instead of ten columns.
  profile: jsonb('profile').notNull().default({}),
  createdAt: at('created_at').notNull().defaultNow(),
}).enableRLS();

/**
 * A venue: one place guests scan into (VenuePublic / VenueSettings), which is also a Location of
 * its business. Columns are what the server looks up or checks; the rest of what guests see
 * (theme, hours, banner, socials, menu style, notices…) lives in `profile`, saved as a whole.
 */
export const venues = pgTable(
  'venues',
  {
    id: text('id').primaryKey(),
    businessId: text('business_id')
      .notNull()
      .references(() => businesses.id),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    currency: text('currency', { enum: ['GHS', 'NGN', 'KES', 'ZAR', 'XOF', 'USD'] })
      .notNull()
      .default('GHS'),
    // IANA zone for "today", opening hours and daily order numbers. Ghana is UTC all year.
    timeZone: text('time_zone').notNull().default('Africa/Accra'),
    published: boolean('published').notNull().default(true),
    profile: jsonb('profile').notNull(),
    // Location fields (address, digital address, geo point), owner-facing.
    address: jsonb('address').notNull().default({}),
    services: jsonb('services').notNull().default([]),
    // Guest-visible: the Wi-Fi card shows the password on purpose (GET /venues/{slug}/wifi).
    wifi: jsonb('wifi'),
    tax: jsonb('tax'),
    // Owner only: where new-order alerts go on WhatsApp. Never sent to guests.
    whatsappAlerts: text('whatsapp_alerts'),
    createdAt: at('created_at').notNull().defaultNow(),
  },
  (t) => [check('venues_slug_shape', sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`)],
).enableRLS();

/**
 * How a venue takes money (PaymentSettings). Its own table so the encrypted Paystack secret sits
 * apart from everything a venue query reads. The secret is encrypted by the server before it gets
 * here (5.4) and is never sent back; only its last 4 characters are (secretKeyHint).
 */
export const paymentSettings = pgTable('payment_settings', {
  venueId: text('venue_id')
    .primaryKey()
    .references(() => venues.id, { onDelete: 'cascade' }),
  paystackMode: text('paystack_mode', { enum: ['test', 'live'] }),
  paystackPublicKey: text('paystack_public_key'),
  paystackSecretEncrypted: text('paystack_secret_encrypted'),
  paystackSecretHint: text('paystack_secret_hint'),
  paystackConnectedAt: at('paystack_connected_at'),
  manual: jsonb('manual').notNull(),
  feePassing: jsonb('fee_passing'),
  updatedAt: at('updated_at').notNull().defaultNow(),
}).enableRLS();

/**
 * A venue's Chowdeck channel (Channel in the contract, docs/connectors-plan.md). Like the Paystack
 * secret, the Chowdeck secret key and webhook secret are sealed by the server before they get here
 * and are never sent back; only the key's last 4 characters are (secretKeyHint). Test keys only.
 */
export const chowdeckChannels = pgTable('chowdeck_channels', {
  venueId: text('venue_id')
    .primaryKey()
    .references(() => venues.id, { onDelete: 'cascade' }),
  enabled: boolean('enabled').notNull().default(false),
  priceRule: jsonb('price_rule').notNull(),
  hiddenItemIds: jsonb('hidden_item_ids').notNull().default([]),
  sync: jsonb('sync').notNull(),
  merchantReference: text('merchant_reference'),
  secretEncrypted: text('secret_encrypted'),
  secretHint: text('secret_hint'),
  webhookSecretEncrypted: text('webhook_secret_encrypted'),
  connectedAt: at('connected_at'),
  updatedAt: at('updated_at').notNull().defaultNow(),
}).enableRLS();

/** Tables with a QR code. The code is what the QR holds: /{venueSlug}/t/{code}. */
export const diningTables = pgTable(
  'dining_tables',
  {
    id: text('id').primaryKey(),
    venueId: text('venue_id')
      .notNull()
      .references(() => venues.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    label: text('label'),
    createdAt: at('created_at').notNull().defaultNow(),
  },
  (t) => [unique('dining_tables_venue_code').on(t.venueId, t.code)],
).enableRLS();
