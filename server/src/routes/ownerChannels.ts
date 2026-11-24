import { Hono, type Context } from 'hono';
import { z } from 'zod';
import { body, Problem } from '../http/problem.ts';
import { roleAt, ROLES, signedIn, type OwnerDeps } from '../owner/staff.ts';
import {
  channelList,
  checkChannelPatch,
  startPublish,
  webhookUrlFor,
  type ChannelRefusal,
} from '../shared/channels.ts';
import { onlineOrderingOf } from '../shared/onlineOrdering.ts';
import type { ChannelKind } from '../shared/types.ts';
import { venueRowById, type VenueProfile } from '../venues/venueData.ts';
import type { VenueChowdeckStore } from '../venues/venueChowdeck.ts';

export type ChannelDeps = OwnerDeps & { chowdeckKeys: VenueChowdeckStore };

const KINDS = ['table', 'online', 'chowdeck'] as const;
const priceRule = z.object({
  percent: z.number().int().min(0).max(100),
  roundToPesewas: z.union([z.literal(1), z.literal(10), z.literal(50), z.literal(100)]),
});
const patchBody = z.object({
  enabled: z.boolean().optional(),
  priceRule: priceRule.optional(),
  hiddenItemIds: z.array(z.string().min(1).max(64)).max(500).optional(),
});
const keysBody = z.object({
  mode: z.literal('test'),
  merchantReference: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[A-Za-z0-9_-]+$/),
  secretKey: z.string().trim().min(10).max(200),
  webhookSecret: z.string().trim().min(10).max(200),
});

const refuse = (r: ChannelRefusal) => new Problem(r.status, r.code, r.message);

/**
 * Where the menu is published (api/openapi.yaml owner-channels, docs/connectors-plan.md).
 * Owners and managers set the channels; only the owner saves or removes the Chowdeck keys.
 * Nothing is sent to Chowdeck yet: publishing leaves the channel `pending` (BUILD.md 5b.11).
 */
export function ownerChannelRoutes(deps: ChannelDeps) {
  const app = new Hono();
  const { db, chowdeckKeys, now } = deps;

  // The role check comes first, so a refused role always gets 403, whatever else is wrong.
  const venueFor = async (c: Context, roles: (typeof ROLES)[keyof typeof ROLES]) => {
    const venueId = c.req.param('venueId') ?? '';
    roleAt(await signedIn(c, deps), venueId, roles);
    return venueRowById(db, venueId);
  };
  const kindOf = (c: Context): ChannelKind => {
    const kind = c.req.param('channel') ?? '';
    if (!(KINDS as readonly string[]).includes(kind))
      throw new Problem(404, 'not_found', 'No such channel.');
    return kind as ChannelKind;
  };
  // Heroku passes on whether the guest used https; the address is only shown to the owner.
  const webhookUrl = (c: Context) => {
    const url = new URL(c.req.url);
    const proto = c.req.header('x-forwarded-proto') ?? url.protocol.replace(':', '');
    return webhookUrlFor(`${proto}://${url.host}/v1`);
  };
  const listFor = async (c: Context, venueId: string, profile: unknown) =>
    channelList({
      onlineEnabled: onlineOrderingOf((profile as VenueProfile).onlineOrdering).enabled,
      chowdeck: await chowdeckKeys.read(venueId, webhookUrl(c)),
    });
  const chowdeckOf = async (c: Context, venueId: string, profile: unknown) =>
    (await listFor(c, venueId, profile))[2]!;

  app.get('/owner/venues/:venueId/channels', async (c) => {
    const venue = await venueFor(c, ROLES.menu);
    return c.json({ channels: await listFor(c, venue.id, venue.profile) });
  });

  // Before /:channel, so "chowdeck/keys" isn't read as a channel name.
  app.put('/owner/venues/:venueId/channels/chowdeck/keys', async (c) => {
    const venue = await venueFor(c, ROLES.payments);
    const keys = await body(c, keysBody);
    await chowdeckKeys.saveKeys(venue.id, keys, now());
    return c.json(await chowdeckOf(c, venue.id, venue.profile));
  });

  app.delete('/owner/venues/:venueId/channels/chowdeck/keys', async (c) => {
    const venue = await venueFor(c, ROLES.payments);
    await chowdeckKeys.removeKeys(venue.id, now());
    return c.json(await chowdeckOf(c, venue.id, venue.profile));
  });

  app.patch('/owner/venues/:venueId/channels/:channel', async (c) => {
    const venue = await venueFor(c, ROLES.menu);
    const kind = kindOf(c);
    const patch = await body(c, patchBody);
    const current = await chowdeckKeys.read(venue.id, webhookUrl(c));
    const refused = checkChannelPatch(kind, patch, current);
    if (refused) throw refuse(refused);
    await chowdeckKeys.saveSettings(
      venue.id,
      {
        enabled: patch.enabled ?? current.enabled,
        priceRule: patch.priceRule ?? current.priceRule,
        hiddenItemIds: patch.hiddenItemIds
          ? [...new Set(patch.hiddenItemIds)]
          : current.hiddenItemIds,
        sync: current.sync,
      },
      now(),
    );
    return c.json(await chowdeckOf(c, venue.id, venue.profile));
  });

  app.post('/owner/venues/:venueId/channels/:channel/publish', async (c) => {
    const venue = await venueFor(c, ROLES.menu);
    const kind = kindOf(c);
    const current = await chowdeckKeys.read(venue.id, webhookUrl(c));
    const result = startPublish(kind, current, now());
    if (!result.ok) throw refuse(result);
    await chowdeckKeys.saveSettings(venue.id, { ...current, sync: result.sync }, now());
    return c.json(await chowdeckOf(c, venue.id, venue.profile), 202);
  });

  return app;
}
