import { sql } from 'drizzle-orm';
import { boolean, check, date, integer, jsonb, pgTable, text, unique } from 'drizzle-orm/pg-core';
import { at, money } from './columns.ts';
import { loyaltyMembers } from './guests.ts';
import { venues } from './venues.ts';

/**
 * An order (Order). The server works out every amount; the app sends dish ids and quantities only.
 * The status changes only by the order state machine (BUILD.md section 9).
 *
 * Privacy (Act 843): a table order has no contact details. A menu-link order (pickup or delivery)
 * carries the name, phone and address on the order only, never in a guest session or a log.
 */
export const orders = pgTable(
  'orders',
  {
    id: text('id').primaryKey(),
    venueId: text('venue_id').notNull().references(() => venues.id),
    // Short number for guests and staff. Starts again at 1 each day in the venue's time zone.
    number: integer('number').notNull(),
    businessDay: date('business_day').notNull(),
    tableCode: text('table_code'),
    source: text('source', { enum: ['table', 'pickup', 'delivery'] }).notNull().default('table'),
    // A rejected order is cancelled with a cancelReason (contract OrderStatus).
    status: text('status', { enum: ['received', 'preparing', 'ready', 'served', 'cancelled'] }).notNull(),
    subtotalPesewas: money('subtotal_pesewas').notNull(),
    taxes: jsonb('taxes').notNull().default([]),
    promoDiscounts: jsonb('promo_discounts').notNull().default([]),
    deliveryFeePesewas: money('delivery_fee_pesewas').notNull().default(0),
    totalPesewas: money('total_pesewas').notNull(),
    // Food paid off so far: succeeded payments' shares and staff-marked payments. Never fees or tips.
    paidPesewas: money('paid_pesewas').notNull().default(0),
    paymentMethod: text('payment_method'),
    contact: jsonb('contact'),
    deliveryAddress: text('delivery_address'),
    etaMinutes: integer('eta_minutes'),
    cancelReason: text('cancel_reason'),
    // The guest session that placed it, so only that guest can read it with a guest token.
    guestSessionId: text('guest_session_id'),
    // The guest's loyalty card, when they placed the order with their loyalty token: the card's id,
    // never their phone. Paying the order stamps that card. Erasing the member clears it.
    loyaltyMemberId: text('loyalty_member_id').references(() => loyaltyMembers.id, { onDelete: 'set null' }),
    createdByStaffId: text('created_by_staff_id'),
    createdAt: at('created_at').notNull().defaultNow(),
    updatedAt: at('updated_at').notNull().defaultNow(),
    readyAt: at('ready_at'),
    servedAt: at('served_at'),
  },
  (t) => [
    unique('orders_daily_number').on(t.venueId, t.businessDay, t.number),
    check('orders_money', sql`${t.subtotalPesewas} >= 0 and ${t.totalPesewas} >= 0 and ${t.paidPesewas} between 0 and ${t.totalPesewas}`),
  ],
).enableRLS();

/** One dish on an order. Name and prices are copied when ordered, so later menu edits don't change history. */
export const orderLines = pgTable(
  'order_lines',
  {
    id: text('id').primaryKey(),
    orderId: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    menuItemId: text('menu_item_id').notNull(),
    name: text('name').notNull(),
    quantity: integer('quantity').notNull(),
    modifiers: jsonb('modifiers').notNull().default([]),
    unitPricePesewas: money('unit_price_pesewas').notNull(),
    totalPesewas: money('total_pesewas').notNull(),
    discountPesewas: money('discount_pesewas').notNull().default(0),
    note: text('note'),
    // True once paid in a "my items" split.
    paid: boolean('paid').notNull().default(false),
  },
  (t) => [check('order_lines_quantity', sql`${t.quantity} >= 1`)],
).enableRLS();

/**
 * A bill quote (BillQuote): what one guest will pay now. A payment can only start from a quote
 * that hasn't expired, so the amount Paystack charges is always the server's own figure.
 */
export const billQuotes = pgTable('bill_quotes', {
  id: text('id').primaryKey(),
  orderId: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  mode: text('mode', { enum: ['whole', 'equal', 'items'] }).notNull(),
  lineIds: text('line_ids').array().notNull().default(sql`'{}'::text[]`),
  sharePesewas: money('share_pesewas').notNull(),
  tipPesewas: money('tip_pesewas').notNull(),
  feePesewas: money('fee_pesewas').notNull().default(0),
  totalPesewas: money('total_pesewas').notNull(),
  remainingAfterPesewas: money('remaining_after_pesewas').notNull(),
  expiresAt: at('expires_at').notNull(),
  createdAt: at('created_at').notNull().defaultNow(),
}).enableRLS();

/** "Call the waiter" (WaiterCall), with the owner app's reply and snooze. */
export const waiterCalls = pgTable('waiter_calls', {
  id: text('id').primaryKey(),
  venueId: text('venue_id').notNull().references(() => venues.id),
  tableCode: text('table_code').notNull(),
  reason: text('reason', {
    enum: ['water', 'bill', 'cutlery', 'order_more', 'clean_table', 'other'],
  }).notNull(),
  note: text('note'),
  status: text('status', { enum: ['open', 'acknowledged', 'resolved'] }).notNull().default('open'),
  staffMembershipId: text('staff_membership_id'),
  staffFirstName: text('staff_first_name'),
  reply: text('reply'),
  guestSessionId: text('guest_session_id'),
  createdAt: at('created_at').notNull().defaultNow(),
  acknowledgedAt: at('acknowledged_at'),
  resolvedAt: at('resolved_at'),
  repliedAt: at('replied_at'),
  snoozedUntil: at('snoozed_until'),
}).enableRLS();
