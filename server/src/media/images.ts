import { and, eq } from 'drizzle-orm';
import type { Db } from '../db/client.ts';
import { media } from '../db/schema.ts';
import { Problem } from '../http/problem.ts';
import type { Image } from '../shared/types.ts';
import type { MediaStorage } from './storage.ts';

/**
 * The photo behind a media id, as the contract's Image. It must belong to this venue and its file
 * must have arrived; the size is read once and kept on the row.
 */
export async function imageFor(db: Db, storage: MediaStorage | null, venueId: string, mediaId: string): Promise<Image> {
  const [row] = await db.select().from(media).where(and(eq(media.id, mediaId), eq(media.venueId, venueId)));
  if (!row || !storage) throw new Problem(422, 'media_not_found', 'That photo did not finish uploading. Try again.');
  let { width, height } = row;
  if (!width || !height) {
    const seen = await storage.inspect(row.path, row.contentType);
    if (!seen.ok) {
      // A signed URL can be filled with anything. Drop a file that is not the photo we signed for
      // so the public bucket does not keep serving it.
      if (seen.reason === 'rejected') await storage.remove(row.path).catch(() => undefined);
      throw new Problem(422, 'media_not_found', 'That photo did not finish uploading. Try again.');
    }
    ({ width, height } = seen);
    await db.update(media).set({ width, height }).where(eq(media.id, row.id));
  }
  return { url: storage.publicUrl(row.path), width, height };
}
