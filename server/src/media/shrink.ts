import sharp from 'sharp';

export type MediaKind = 'banner' | 'logo' | 'dish_photo';

/**
 * The widest each kind of photo is ever shown, in pixels. A phone is about 390 points wide at
 * 3 pixels per point, so a full-width dish photo needs about 1080; a banner also shows on wide
 * screens; a logo is never shown bigger than a thumbnail. Anything wider is data a guest on
 * mobile data pays for and never sees.
 */
export const MAX_WIDTH: Record<MediaKind, number> = { logo: 512, dish_photo: 1080, banner: 1600 };

// WebP at 80 looks the same as the phone's JPEG on a phone screen, at a fraction of the size.
const QUALITY = 80;

/**
 * Makes the copy guests load. Turns a sideways phone photo upright (phones store the turn in
 * EXIF), shrinks it to its kind's width (never enlarging) and saves it as WebP. sharp drops all
 * metadata unless asked to keep it, so EXIF, including any GPS location, never reaches a guest.
 * Throws when the file is not a photo sharp can read.
 */
export async function shrink(
  bytes: Uint8Array,
  kind: MediaKind,
): Promise<{ bytes: Buffer; width: number; height: number }> {
  const { data, info } = await sharp(bytes)
    .rotate()
    .resize({ width: MAX_WIDTH[kind], withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toBuffer({ resolveWithObject: true });
  return { bytes: data, width: info.width, height: info.height };
}
