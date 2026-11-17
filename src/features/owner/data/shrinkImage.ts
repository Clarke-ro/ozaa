/** Which photo it is: each kind has its own size. Same names as uploadImage's MediaKind. */
type MediaKind = 'banner' | 'logo' | 'dish_photo';

/**
 * The longest side each kind of photo needs. A phone photo is about 4000 px and 3–5 MB; every guest
 * would download that for one dish. Shrunk to these sizes it is a few hundred KB and still sharp
 * on a big phone screen (2–3× pixel density at full width).
 */
export const LONG_EDGE: Record<MediaKind, number> = { dish_photo: 1600, banner: 2000, logo: 512 };

// JPEG quality: no visible loss on food photos, about a tenth of the original size.
const QUALITY = 0.82;

/** The size that fits inside `max` on its long edge. Smaller photos are left as they are. */
export function fitWithin(
  width: number,
  height: number,
  max: number,
): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/**
 * A smaller copy of the photo for upload (web only). Logos stay PNG so a transparent background
 * survives; everything else becomes JPEG. If the copy would be bigger, or the browser can't draw
 * it, the original file is used.
 */
export async function shrinkImage(file: File, kind: MediaKind): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const size = fitWithin(bitmap.width, bitmap.height, LONG_EDGE[kind]);
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, size.width, size.height);
    bitmap.close();
    const type = kind === 'logo' && file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, QUALITY));
    if (!blob || blob.size >= file.size) return file;
    const name = file.name.replace(/\.[^.]+$/, type === 'image/png' ? '.png' : '.jpg');
    return new File([blob], name, { type });
  } catch {
    return file;
  }
}
