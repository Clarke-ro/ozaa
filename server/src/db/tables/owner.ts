import { boolean, index, integer, jsonb, pgTable, primaryKey, text } from 'drizzle-orm/pg-core';
import { at, money } from './columns.ts';
import { staffUsers } from './staff.ts';
import { venues } from './venues.ts';

/**
 * Promos (Promo): rules the server applies to a bill. The best single promo wins; they never stack.
 * The rule fields (kind, percent, days, times…) are saved as one JSON value, as PromoInput.
 */
export const promos = pgTable('promos', {
  id: text('id').primaryKey(),
  venueId: text('venue_id').notNull().references(() => venues.id, { onDelete: 'cascade' }),
  rule: jsonb('rule').notNull(),
  // A code guests type in, upper case. Null applies on its own.
  code: text('code'),
  enabled: boolean('enabled').notNull().default(true),
  usageCount: integer('usage_count').notNull().default(0),
  discountGivenPesewas: money('discount_given_pesewas').notNull().default(0),
  createdAt: at('created_at').notNull().defaultNow(),
  deletedAt: at('deleted_at'),
}).enableRLS();

/** The owner app's feed (OwnerNotification). One row per event, for the whole venue. */
export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  venueId: text('venue_id').notNull().references(() => venues.id, { onDelete: 'cascade' }),
  kind: text('kind', { enum: ['order', 'call', 'bill', 'guest_note', 'review'] }).notNull(),
  title: text('title').notNull(),
  detail: text('detail'),
  targetType: text('target_type', { enum: ['order', 'call', 'table', 'feedback', 'review'] }).notNull(),
  targetId: text('target_id').notNull(),
  createdAt: at('created_at').notNull().defaultNow(),
}, (t) => [index('notifications_venue_time').on(t.venueId, t.createdAt)]).enableRLS();

/** Read state is per person: the waiter reading a call doesn't mark it read for the owner. */
export const notificationReads = pgTable(
  'notification_reads',
  {
    notificationId: text('notification_id').notNull().references(() => notifications.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => staffUsers.id, { onDelete: 'cascade' }),
    readAt: at('read_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.notificationId, t.userId] })],
).enableRLS();

/** The owner's own links on the guest home or menu (CustomLink). */
export const customLinks = pgTable('custom_links', {
  id: text('id').primaryKey(),
  venueId: text('venue_id').notNull().references(() => venues.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  url: text('url').notNull(),
  icon: text('icon'),
  placement: text('placement', { enum: ['button', 'banner', 'menu'] }).notNull(),
  startDate: at('start_date'),
  endDate: at('end_date'),
  sortOrder: integer('sort_order').notNull().default(0),
  clicks: integer('clicks').notNull().default(0),
  enabled: boolean('enabled').notNull().default(true),
}).enableRLS();

/**
 * Idempotency-Key store (5.3, used by every POST that creates something). The first answer is
 * saved; a retry with the same key and the same caller gets it back instead of doing it twice.
 * `scope` keeps one caller's key from ever returning another caller's answer.
 */
export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    scope: text('scope').notNull(),
    key: text('key').notNull(),
    status: integer('status').notNull(),
    body: jsonb('body'),
    createdAt: at('created_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.scope, t.key] }), index('idempotency_keys_age').on(t.createdAt)],
).enableRLS();
