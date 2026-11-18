import { imageSize } from 'image-size';

/** Photos the owner app is allowed to put in the bucket. Same list as the upload request. */
export const UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type UploadType = (typeof UPLOAD_TYPES)[number];
/** The contract's cap (ownerCreateMediaUpload). A signed URL cannot enforce it on its own. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export type InspectedPhoto =
  | { ok: true; width: number; height: number }
  | { ok: false; reason: 'missing' | 'rejected' };

/** Where photo files live. The real one is Supabase Storage; tests pass a small fake. */
export type MediaStorage = {
  /** A URL the owner app PUTs one file to, valid for about two hours. */
  signUpload(path: string): Promise<string>;
  /** The public address guests load the photo from. */
  publicUrl(path: string): string;
  /**
   * What was actually stored at `path`, checked against the type the upload was signed for.
   * `rejected` means a file is there and it is the wrong type or too big.
   */
  inspect(path: string, expectedType: string): Promise<InspectedPhoto>;
  /** Deletes the object. A missing object is fine. */
  remove(path: string): Promise<void>;
};

// Enough of the file to find its size: JPEG puts it after the EXIF block, which phones can make
// large, so read a generous start rather than the whole photo.
const HEAD_BYTES = 512 * 1024;
const MAGIC: Record<UploadType, (bytes: Uint8Array) => boolean> = {
  'image/jpeg': (bytes) => bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  'image/png': (bytes) =>
    bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47,
  'image/webp': (bytes) =>
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50,
};

function mimeOf(header: string | null): string | null {
  const mime = header?.split(';')[0]?.trim().toLowerCase();
  return mime || null;
}

function numberHeader(header: string | null): number | null {
  if (!header) return null;
  const value = Number(header);
  return Number.isFinite(value) ? value : null;
}

function rangeTotal(header: string | null): number | null {
  const match = header?.match(/\/(\d+)\s*$/);
  return match ? Number(match[1]) : null;
}

function isUploadType(value: string): value is UploadType {
  return (UPLOAD_TYPES as readonly string[]).includes(value);
}

/**
 * Supabase Storage over its REST API. The bucket is public to read (guests load menu photos with
 * no sign-in) but only this server, with the secret key, can hand out upload URLs. The key never
 * leaves the server: the app gets a one-file, short-lived upload URL instead.
 *
 * The signed URL itself does not lock the type or the size. Those limits belong on the bucket
 * (`allowed_mime_types` of image/jpeg, image/png, image/webp, and `file_size_limit` of 5 MB).
 * The bucket's type list trusts the Content-Type the uploader sends, so `inspect` also reads
 * the bytes before a photo is shown, and the caller deletes a file that fails.
 */
export function supabaseStorage(options: {
  url: string;
  secretKey: string;
  bucket: string;
  fetchFn?: typeof fetch;
}): MediaStorage {
  const base = `${options.url.replace(/\/+$/, '')}/storage/v1`;
  const fetchFn = options.fetchFn ?? fetch;
  const auth = { apikey: options.secretKey, Authorization: `Bearer ${options.secretKey}` };
  const publicUrl = (path: string) => `${base}/object/public/${options.bucket}/${path}`;

  return {
    async signUpload(path) {
      const res = await fetchFn(`${base}/object/upload/sign/${options.bucket}/${path}`, {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: '{}',
      });
      const data = (await res.json().catch(() => null)) as { url?: string } | null;
      if (!res.ok || !data?.url) throw new Error(`Storage refused the upload (${res.status})`);
      return `${base}${data.url}`;
    },
    publicUrl,
    async inspect(path, expectedType) {
      if (!isUploadType(expectedType)) return { ok: false, reason: 'rejected' };
      const url = publicUrl(path);
      const head = await fetchFn(url, { method: 'HEAD' });
      let headLength: number | null = null;
      // A failed HEAD is not proof the file is missing. Some stores answer 400 or 405 to HEAD
      // and still serve the file on GET, which is how photos were read before this check.
      if (head.ok) {
        headLength = numberHeader(head.headers.get('content-length'));
        if (headLength != null && headLength > MAX_UPLOAD_BYTES) return { ok: false, reason: 'rejected' };
        const headType = mimeOf(head.headers.get('content-type'));
        if (headType && headType !== 'application/octet-stream' && headType !== expectedType) {
          return { ok: false, reason: 'rejected' };
        }
      }
      const res = await fetchFn(url, { headers: { Range: `bytes=0-${HEAD_BYTES - 1}` } });
      if (res.status === 400 || res.status === 404) return { ok: false, reason: 'missing' };
      if (!res.ok && res.status !== 206) return { ok: false, reason: 'missing' };
      const total =
        rangeTotal(res.headers.get('content-range')) ??
        (res.status === 200 ? numberHeader(res.headers.get('content-length')) : headLength);
      if (total == null || total < 1 || total > MAX_UPLOAD_BYTES) return { ok: false, reason: 'rejected' };
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (bytes.byteLength > MAX_UPLOAD_BYTES || !MAGIC[expectedType](bytes)) return { ok: false, reason: 'rejected' };
      try {
        const size = imageSize(bytes);
        const kind = size.type === 'jpg' ? 'image/jpeg' : size.type === 'png' ? 'image/png' : size.type === 'webp' ? 'image/webp' : '';
        if (kind !== expectedType || !size.width || !size.height) return { ok: false, reason: 'rejected' };
        return { ok: true, width: size.width, height: size.height };
      } catch {
        return { ok: false, reason: 'rejected' };
      }
    },
    async remove(path) {
      const encoded = path.split('/').map((part) => encodeURIComponent(part)).join('/');
      await fetchFn(`${base}/object/${options.bucket}/${encoded}`, { method: 'DELETE', headers: auth }).catch(() => undefined);
    },
  };
}
