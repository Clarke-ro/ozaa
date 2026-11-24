import { and, eq } from 'drizzle-orm';
import type { Db } from '../db/client.ts';
import { media } from '../db/schema.ts';
import { Problem } from '../http/problem.ts';
import type { Image } from '../shared/types.ts';
import { shrink } from './shrink.ts';
import type { MediaStorage } from './storage.ts';

const notArrived = () =>
  new Problem(422, 'media_not_found', 'That photo did not finish uploading. Try again.');

/**
 * The photo behind a media id, as the contract's Image. It must belong to this venue and its file
 * must have arrived. The first time a dish or venue uses it, the server makes the copy guests load
 * (upright, resized for its kind, WebP, no EXIF: media/shrink.ts), saves it next to the original
 * and points the row at it, so later uses just read the row.
 */
export async function imageFor(
  db: Db,
  storage: MediaStorage | null,
  venueId: string,
  mediaId: string,
): Promise<Image> {
  const [row] = await db
    .select()
    .from(media)
    .where(and(eq(media.id, mediaId), eq(media.venueId, venueId)));
  if (!row || !storage) throw notArrived();
  if (row.width && row.height)
    return { url: storage.publicUrl(row.path), width: row.width, height: row.height };

  const original = await storage.download(row.path);
  if (!original) throw notArrived();
  const made = await shrink(original, row.kind).catch(() => {
    throw new Problem(
      422,
      'media_not_found',
      "That file isn't a photo we can read. Try another one.",
    );
  });
  // A new name, so a phone that cached the original never shows it in place of the copy.
  const path = `${venueId}/${row.id}-${made.width}.webp`;
  await storage.put(path, made.bytes, 'image/webp');
  await db
    .update(media)
    .set({ path, contentType: 'image/webp', width: made.width, height: made.height })
    .where(eq(media.id, row.id));
  return { url: storage.publicUrl(path), width: made.width, height: made.height };
}
