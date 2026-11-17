import { eq } from 'drizzle-orm';
import type { Db } from '../db/client.ts';
import { venues } from '../db/schema.ts';
import { deriveTheme } from '../shared/deriveTheme.ts';
import type { ServiceSettings, VenuePublic, VenueSettings, VenueTheme } from '../shared/types.ts';
import { publicVenue, type VenueProfile } from './venueData.ts';

type VenueRow = typeof venues.$inferSelect;

const NO_TAX = { enabled: false, pricesIncludeTax: true, tin: null };

/**
 * The venue as the Customise screens edit it: the public venue plus every service (on or off),
 * every notice as set, Wi-Fi, tax and the WhatsApp alerts number. `alerts` is false for staff who
 * shouldn't see the owner's alerts line.
 */
export async function settingsOf(db: Db, row: VenueRow, now: number, alerts: boolean): Promise<VenueSettings> {
  const profile = row.profile as VenueProfile;
  return {
    ...(await publicVenue(db, row, now)),
    services: row.services as VenuePublic['services'],
    noticeSettings: profile.noticeSettings ?? { banner: null, popup: null },
    ...(row.wifi ? { wifi: row.wifi as VenueSettings['wifi'] } : {}),
    tax: (row.tax as VenueSettings['tax']) ?? NO_TAX,
    whatsappAlerts: alerts ? row.whatsappAlerts : null,
  };
}

export function servicesOf(row: VenueRow): ServiceSettings {
  return {
    services: row.services as ServiceSettings['services'],
    game: (row.profile as VenueProfile).game ?? { enabled: false, minScore: 15 },
  };
}

/**
 * The same theme the app works out (src/features/theming/deriveTheme.ts): the venue's colour,
 * darkened until text on it passes contrast. Guests are shown `derived`, never the raw colour.
 */
export function themeOf(accent: string | null, fontPair: VenueTheme['fontPair']): VenueTheme {
  const d = deriveTheme(accent);
  return {
    accent,
    fontPair,
    derived: {
      fill: d.fill,
      onAccent: d.onAccent,
      pressed: d.pressed,
      ink: d.ink,
      tint: d.tint,
      badgeInk: d.badgeInk,
      notes: d.notes,
      cravinsDistance: d.cravinsDistance,
      ratios: { buttonText: d.ratios.buttonText, inkOnWhite: d.ratios.inkOnWhite, badge: d.ratios.badge },
    },
  };
}

export async function saveProfile(db: Db, row: VenueRow, change: Partial<VenueProfile>, columns: Partial<typeof venues.$inferInsert> = {}) {
  const [saved] = await db
    .update(venues)
    .set({ ...columns, profile: { ...(row.profile as VenueProfile), ...change } })
    .where(eq(venues.id, row.id))
    .returning();
  return saved!;
}
