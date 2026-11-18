import { Hono, type Context } from 'hono';
import { z } from 'zod';
import { body, Problem } from '../http/problem.ts';
import { imageFor } from '../media/images.ts';
import type { MediaStorage } from '../media/storage.ts';
import { roleAt, ROLES, signedIn, type OwnerDeps } from '../owner/staff.ts';
import type { StaffRole } from '../shared/types.ts';
import { venueRowById, type VenueProfile } from '../venues/venueData.ts';
import { saveProfile, servicesOf, settingsOf, themeOf } from '../venues/venueSettings.ts';
import {
  hoursInput,
  menuStyleInput,
  noticeSettingsInput,
  onlineOrderingInput,
  socialsInput,
} from '../venues/settingsInput.ts';

const phone = z.string().regex(/^\+233\d{9}$/);
const service = z.object({
  id: z.string().min(1),
  section: z.string().min(1),
  enabled: z.boolean(),
  subtitle: z.string().max(60).optional(),
});

// The fields the Customise screens send. Nested settings are checked in settingsInput.ts.
const patchBody = z
  .object({
    name: z.string().trim().min(1).max(60),
    tagline: z.string().max(100),
    description: z.record(z.string(), z.string().max(600)),
    phone,
    whatsapp: phone,
    whatsappAlerts: phone.nullable(),
    // Shown to guests as a link, so only https: never javascript: or another scheme.
    googleReviewUrl: z.url({ protocol: /^https$/ }).nullable(),
    published: z.boolean(),
    languages: z.array(z.string().min(2).max(5)).max(10),
    hours: hoursInput,
    location: z.object({ label: z.string().max(120).optional(), lat: z.number().min(-90).max(90).optional(), lng: z.number().min(-180).max(180).optional() }),
    menuStyle: menuStyleInput,
    socials: socialsInput,
    onlineOrdering: onlineOrderingInput,
    noticeSettings: noticeSettingsInput,
    stylePreset: z.enum(['default', 'classic', 'editorial', 'modern']),
    buttonTint: z.enum(['auto', 'light', 'dark']),
    buttonOrder: z.array(z.string()).max(20),
    sectionOrder: z.array(z.enum(['table', 'rewards', 'fun', 'more', 'socials'])).max(5),
    wifi: z.object({
      ssid: z.string().min(1).max(32),
      password: z.string().max(63).optional(),
      security: z.enum(['WPA', 'WPA2', 'WPA3', 'WEP', 'nopass', 'OPEN']),
      hidden: z.boolean().optional(),
    }),
    tax: z.object({ enabled: z.boolean(), pricesIncludeTax: z.boolean(), tin: z.string().regex(/^[A-Z][0-9]{10}$/).nullable().optional() }),
    bannerMediaId: z.string().min(1),
    logoMediaId: z.string().min(1).nullable(),
  })
  .partial();

const themeBody = z.object({
  accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable(),
  fontPair: z.enum(['cravins', 'serif', 'bold']),
});
const servicesBody = z.object({
  services: z.array(service).max(30),
  game: z.object({ enabled: z.boolean(), minScore: z.number().int().min(1).max(200) }),
});

/** The Customise screens (api/openapi.yaml owner-venue): profile, branding, services. */
export function ownerVenueRoutes(deps: OwnerDeps & { storage: MediaStorage | null }) {
  const app = new Hono();
  const { db } = deps;

  const venueFor = async (c: Context, allowed: StaffRole[]) => {
    const role = roleAt(await signedIn(c, deps), c.req.param('venueId') ?? '', allowed);
    return { row: await venueRowById(db, c.req.param('venueId') ?? ''), role };
  };
  // The alerts number is the owner's own line: managers and owners only.
  const seesAlerts = (role: StaffRole) => role === 'owner' || role === 'manager';

  // Every staff member reads the venue (its name, hours and services drive their screens).
  app.get('/owner/venues/:venueId', async (c) => {
    const { row, role } = await venueFor(c, ROLES.orders);
    return c.json(await settingsOf(db, row, deps.now(), seesAlerts(role)));
  });

  app.patch('/owner/venues/:venueId', async (c) => {
    const { row, role } = await venueFor(c, ROLES.menu);
    const input = await body(c, patchBody);
    const { name, published, wifi, tax, whatsappAlerts, bannerMediaId, logoMediaId, location, menuStyle, noticeSettings, ...rest } = input;
    const profile = row.profile as VenueProfile;
    const change: Partial<VenueProfile> = { ...(rest as Partial<VenueProfile>) };
    // Saving one part of a nested setting keeps the others, as the demo does.
    if (location) change.location = { ...profile.location, ...location } as VenueProfile['location'];
    if (menuStyle) change.menuStyle = { ...profile.menuStyle, ...menuStyle } as VenueProfile['menuStyle'];
    if (noticeSettings) change.noticeSettings = { ...(profile.noticeSettings ?? { banner: null, popup: null }), ...noticeSettings } as VenueProfile['noticeSettings'];
    if (bannerMediaId) change.banner = await imageFor(db, deps.storage, row.id, bannerMediaId);
    if (logoMediaId !== undefined) change.logo = logoMediaId === null ? null : await imageFor(db, deps.storage, row.id, logoMediaId);
    const saved = await saveProfile(db, row, change, {
      ...(name !== undefined ? { name } : {}),
      ...(published !== undefined ? { published } : {}),
      ...(wifi !== undefined ? { wifi } : {}),
      ...(tax !== undefined ? { tax: { ...tax, tin: tax.tin ?? null } } : {}),
      ...(whatsappAlerts !== undefined ? { whatsappAlerts } : {}),
    });
    return c.json(await settingsOf(db, saved, deps.now(), seesAlerts(role)));
  });

  /** The colour is checked on the server too: guests only ever get the contrast-safe version. */
  app.put('/owner/venues/:venueId/theme', async (c) => {
    const { row } = await venueFor(c, ROLES.menu);
    const input = await body(c, themeBody);
    const theme = themeOf(input.accent, input.fontPair);
    await saveProfile(db, row, { theme } as Partial<VenueProfile>);
    return c.json(theme);
  });

  app.get('/owner/venues/:venueId/services', async (c) => {
    const { row } = await venueFor(c, ROLES.orders);
    return c.json(servicesOf(row));
  });

  app.put('/owner/venues/:venueId/services', async (c) => {
    const { row } = await venueFor(c, ROLES.menu);
    const input = await body(c, servicesBody);
    const ids = input.services.map((s) => s.id);
    if (new Set(ids).size !== ids.length) throw new Problem(400, 'validation', 'Each service can be listed once.');
    const saved = await saveProfile(db, row, { game: input.game } as Partial<VenueProfile>, { services: input.services });
    return c.json(servicesOf(saved));
  });

  return app;
}
