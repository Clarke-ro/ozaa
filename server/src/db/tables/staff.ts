import { sql } from 'drizzle-orm';
import { check, integer, jsonb, pgTable, text, unique } from 'drizzle-orm/pg-core';
import { at } from './columns.ts';
import { venues } from './venues.ts';

/**
 * A person who signs in to the owner app (StaffUser). Clerk proves who they are; this row says
 * who that is to Cravins. `clerkUserId` is filled the first time they sign in, by matching the
 * phone Clerk verified (GET /me). Venues and roles come from staffMemberships, never from Clerk.
 */
export const staffUsers = pgTable(
  'staff_users',
  {
    id: text('id').primaryKey(),
    clerkUserId: text('clerk_user_id').unique(),
    phone: text('phone').notNull().unique(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name'),
    email: text('email'),
    photo: jsonb('photo'),
    prefs: jsonb('prefs'),
    // Quick sign-in PIN for one device: a slow hash only, never the PIN (POST /auth/pin).
    pinHash: text('pin_hash'),
    pinDeviceId: text('pin_device_id'),
    // Five wrong PINs in a row clear the PIN (contract, loginWithPin).
    pinFails: integer('pin_fails').notNull().default(0),
    createdAt: at('created_at').notNull().defaultNow(),
  },
  (t) => [check('staff_users_phone_e164', sql`${t.phone} ~ '^\\+233[0-9]{9}$'`)],
).enableRLS();

/**
 * Who works where, and as what (StaffMember). One row per person per venue, so a manager at one
 * venue can be a waiter at another. The role here is what every /owner call checks.
 */
export const staffMemberships = pgTable(
  'staff_memberships',
  {
    id: text('id').primaryKey(),
    venueId: text('venue_id').notNull().references(() => venues.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => staffUsers.id, { onDelete: 'cascade' }),
    role: text('role', {
      enum: ['owner', 'manager', 'waiter', 'kitchen', 'viewer', 'staff_scanner'],
    }).notNull(),
    status: text('status', { enum: ['invited', 'active', 'removed'] }).notNull().default('invited'),
    // The tables this person looks after. Empty means every table.
    tableCodes: text('table_codes').array().notNull().default(sql`'{}'::text[]`),
    joinedAt: at('joined_at'),
    lastActiveAt: at('last_active_at'),
    createdAt: at('created_at').notNull().defaultNow(),
  },
  (t) => [unique('staff_memberships_venue_user').on(t.venueId, t.userId)],
).enableRLS();

/** Shared scanner phones at the door or the counter (ScannerDevice). */
export const scannerDevices = pgTable('scanner_devices', {
  id: text('id').primaryKey(),
  venueId: text('venue_id').notNull().references(() => venues.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  platform: text('platform'),
  pairingCode: text('pairing_code'),
  pairedAt: at('paired_at').notNull().defaultNow(),
  lastSeen: at('last_seen').notNull().defaultNow(),
  revokedAt: at('revoked_at'),
}).enableRLS();
