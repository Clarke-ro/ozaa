import { imageSize } from 'image-size';

/** Where photo files live. The real one is Supabase Storage; tests pass a small fake. */
export type MediaStorage = {
  /** A URL the owner app PUTs one file to, valid for about two hours. */
  signUpload(path: string): Promise<string>;
  /** The public address guests load the photo from. */
  publicUrl(path: string): string;
  /** The photo's size in pixels, or null when no file was uploaded there. */
  measure(path: string): Promise<{ width: number; height: number } | null>;
};

// Enough of the file to find its size: JPEG puts it after the EXIF block, which phones can make
// large, so read a generous start rather than the whole photo.
const HEAD_BYTES = 512 * 1024;

/**
 * Supabase Storage over its REST API. The bucket is public to read (guests load menu photos with
 * no sign-in) but only this server, with the secret key, can hand out upload URLs. The key never
 * leaves the server: the app gets a one-file, short-lived upload URL instead.
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
    async measure(path) {
      const res = await fetchFn(publicUrl(path), { headers: { Range: `bytes=0-${HEAD_BYTES - 1}` } });
      if (!res.ok) return null;
      try {
        const size = imageSize(new Uint8Array(await res.arrayBuffer()));
        return size.width && size.height ? { width: size.width, height: size.height } : null;
      } catch {
        return null;
      }
    },
  };
}
