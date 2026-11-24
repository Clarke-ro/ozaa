import { sql } from 'drizzle-orm';
import { boolean, check, index, integer, jsonb, pgTable, text } from 'drizzle-orm/pg-core';
import { at, money } from './columns.ts';
import { venues } from './venues.ts';

/** A menu section (MenuCategory). Names are LocalizedText, so JSON. */
export const menuCategories = pgTable(
  'menu_categories',
  {
    id: text('id').primaryKey(),
    venueId: text('venue_id')
      .notNull()
      .references(() => venues.id, { onDelete: 'cascade' }),
    name: jsonb('name').notNull(),
    kind: text('kind', { enum: ['food', 'drinks'] }).notNull(),
    position: integer('position').notNull(),
    hidden: boolean('hidden').notNull().default(false),
    schedule: jsonb('schedule'),
  },
  (t) => [index('menu_categories_venue').on(t.venueId)],
).enableRLS();

/**
 * A dish (MenuItem). Price, stock and quantity limits are columns because the server checks them
 * on every order; photos, add-on groups and labels are JSON shown as they are.
 */
export const menuItems = pgTable(
  'menu_items',
  {
    id: text('id').primaryKey(),
    venueId: text('venue_id')
      .notNull()
      .references(() => venues.id, { onDelete: 'cascade' }),
    categoryId: text('category_id')
      .notNull()
      .references(() => menuCategories.id),
    name: jsonb('name').notNull(),
    description: jsonb('description').notNull(),
    pricePesewas: money('price_pesewas').notNull(),
    salePricePesewas: money('sale_price_pesewas'),
    available: boolean('available').notNull().default(true),
    hidden: boolean('hidden').notNull().default(false),
    // Null means unlimited. Each order takes away its quantity; at 0 the dish is sold out.
    stockCount: integer('stock_count'),
    minQuantity: integer('min_quantity').notNull().default(1),
    maxQuantity: integer('max_quantity').notNull().default(50),
    position: integer('position'),
    // Sold out until then ("Back at 17:00"). A column because every order checks it.
    snoozedUntil: at('snoozed_until'),
    // Photo, gallery, dietary labels, badges, add-on groups, allergens, calories, prep time.
    details: jsonb('details').notNull().default({}),
    deletedAt: at('deleted_at'),
  },
  (t) => [
    check('menu_items_price', sql`${t.pricePesewas} >= 0`),
    check(
      'menu_items_sale_below_price',
      sql`${t.salePricePesewas} is null or ${t.salePricePesewas} < ${t.pricePesewas}`,
    ),
    check('menu_items_stock', sql`${t.stockCount} is null or ${t.stockCount} >= 0`),
    // Every guest menu load reads a venue's dishes.
    index('menu_items_venue').on(t.venueId),
    check(
      'menu_items_quantity',
      sql`${t.minQuantity} between 1 and 50 and ${t.maxQuantity} between ${t.minQuantity} and 50`,
    ),
  ],
).enableRLS();

/**
 * The add-on library (Menu.modifierGroups): groups like "Spice level" that many dishes share.
 * A dish lists the ones it uses in details.modifierGroupIds. Option prices are checked on save,
 * because they are added to the bill.
 */
export const modifierGroups = pgTable(
  'modifier_groups',
  {
    id: text('id').primaryKey(),
    venueId: text('venue_id')
      .notNull()
      .references(() => venues.id, { onDelete: 'cascade' }),
    name: jsonb('name').notNull(),
    min: integer('min').notNull(),
    max: integer('max').notNull(),
    options: jsonb('options').notNull(),
    createdAt: at('created_at').notNull().defaultNow(),
  },
  (t) => [index('modifier_groups_venue').on(t.venueId)],
).enableRLS();
