import { isTimeout, outboundSignal } from '../http/outbound.ts';

/** Where photo files live. The real one is Supabase Storage; tests pass a small fake. */
export type MediaStorage = {
  /** A URL the owner app PUTs one file to, valid for about two hours. */
  signUpload(path: string): Promise<string>;
  /** The public address guests load the photo from. */
  publicUrl(path: string): string;
  /** The uploaded file, or null when nothing (or something far too big) is there. */
  download(path: string): Promise<Uint8Array | null>;
  /** Saves a file the server made (the resized copy) with the secret key. */
  put(path: string, bytes: Uint8Array, contentType: string): Promise<void>;
};

// Uploads ask for 5 MB at most, but the signed URL can't enforce it. Refuse to read anything far
// bigger rather than hold it in memory.
const MAX_DOWNLOAD_BYTES = 12 * 1024 * 1024;
// Each saved copy has its own name and never changes, so phones and CDNs may keep it for a year.
const ONE_YEAR = 'max-age=31536000';

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
  timeoutMs?: number;
}): MediaStorage {
  const base = `${options.url.replace(/\/+$/, '')}/storage/v1`;
  const fetchFn = options.fetchFn ?? fetch;
  const auth = { apikey: options.secretKey, Authorization: `Bearer ${options.secretKey}` };
  const publicUrl = (path: string) => `${base}/object/public/${options.bucket}/${path}`;
  const call = async (url: string, init: RequestInit) => {
    try {
      return await fetchFn(url, { ...init, signal: outboundSignal(options.timeoutMs) });
    } catch (error) {
      if (isTimeout(error)) {
        const timeout = new Error('Storage took too long');
        timeout.name = 'UpstreamTimeout';
        throw timeout;
      }
      throw error;
    }
  };

  return {
    async signUpload(path) {
      const res = await call(`${base}/object/upload/sign/${options.bucket}/${path}`, {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: '{}',
      });
      const data = (await res.json().catch(() => null)) as { url?: string } | null;
      if (!res.ok || !data?.url) throw new Error(`Storage refused the upload (${res.status})`);
      return `${base}${data.url}`;
    },
    publicUrl,
    async download(path) {
      const res = await call(publicUrl(path), {});
      if (!res.ok) return null;
      if (Number(res.headers.get('content-length') ?? 0) > MAX_DOWNLOAD_BYTES) return null;
      const bytes = new Uint8Array(await res.arrayBuffer());
      return bytes.byteLength > MAX_DOWNLOAD_BYTES ? null : bytes;
    },
    async put(path, bytes, contentType) {
      const res = await call(`${base}/object/${options.bucket}/${path}`, {
        method: 'POST',
        headers: {
          ...auth,
          'Content-Type': contentType,
          'cache-control': ONE_YEAR,
          'x-upsert': 'true',
        },
        body: new Blob([bytes as Uint8Array<ArrayBuffer>]),
      });
      if (!res.ok) throw new Error(`Storage refused the resized photo (${res.status})`);
    },
  };
}
