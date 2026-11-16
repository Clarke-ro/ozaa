import { Hono } from 'hono';
import { z } from 'zod';
import { media } from '../db/schema.ts';
import { body, Problem } from '../http/problem.ts';
import type { MediaStorage } from '../media/storage.ts';
import { roleAt, ROLES, signedIn, type OwnerDeps } from '../owner/staff.ts';
import { venueRowById } from '../venues/venueData.ts';

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
// Signed upload URLs from Supabase last two hours.
const UPLOAD_TTL_MS = 2 * 60 * 60 * 1000;

const uploadBody = z.object({
  kind: z.enum(['banner', 'logo', 'dish_photo']),
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  sizeBytes: z.number().int().min(1).max(5 * 1024 * 1024),
});

/**
 * POST /owner/venues/{id}/media: a one-file upload URL. The app PUTs the photo straight to storage,
 * so photos never pass through this server, then saves the media id on a dish or the venue.
 */
export function mediaRoutes(deps: OwnerDeps & { storage: MediaStorage | null }) {
  const app = new Hono();
  app.post('/owner/venues/:venueId/media', async (c) => {
    const venueId = c.req.param('venueId');
    roleAt(await signedIn(c, deps), venueId, ROLES.menu);
    await venueRowById(deps.db, venueId);
    const input = await body(c, uploadBody);
    if (!deps.storage) throw new Problem(503, 'uploads_not_ready', 'Photo uploads are not set up on this server yet.');
    const mediaId = `med_${crypto.randomUUID().replaceAll('-', '')}`;
    // One folder per venue, so a venue's photos can be listed or removed together.
    const path = `${venueId}/${mediaId}.${EXT[input.contentType]}`;
    const uploadUrl = await deps.storage.signUpload(path);
    await deps.db.insert(media).values({ id: mediaId, venueId, kind: input.kind, contentType: input.contentType, path });
    return c.json({ mediaId, uploadUrl, expiresAt: new Date(deps.now() + UPLOAD_TTL_MS).toISOString() }, 201);
  });
  return app;
}
