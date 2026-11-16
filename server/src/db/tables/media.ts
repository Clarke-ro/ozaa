import { integer, pgTable, text } from 'drizzle-orm/pg-core';
import { at } from './columns.ts';
import { venues } from './venues.ts';

/**
 * Photos owners upload (POST /owner/venues/{id}/media): dish photos, logos, banners. The file
 * lives in Supabase Storage at `path`; the app PUTs it there with a signed URL. Width and height
 * are read from the file the first time a dish or venue uses it.
 */
export const media = pgTable('media', {
  id: text('id').primaryKey(),
  venueId: text('venue_id').notNull().references(() => venues.id, { onDelete: 'cascade' }),
  kind: text('kind', { enum: ['banner', 'logo', 'dish_photo'] }).notNull(),
  contentType: text('content_type').notNull(),
  path: text('path').notNull(),
  width: integer('width'),
  height: integer('height'),
  createdAt: at('created_at').notNull().defaultNow(),
}).enableRLS();
