import { test } from 'node:test';
import assert from 'node:assert/strict';
import { supabaseStorage } from './storage.ts';

// A 2×3 PNG: the signature, then the IHDR chunk that holds the size.
const PNG = Buffer.from('89504e470d0a1a0a0000000d494844520000000200000003080600000000', 'hex');

test('Supabase: signs a one-file upload with the secret key, and measures the uploaded photo', async () => {
  const seen: { url: string; headers: Record<string, string> }[] = [];
  const fetchFn = (async (url: string, init?: RequestInit) => {
    seen.push({ url, headers: (init?.headers ?? {}) as Record<string, string> });
    if (url.includes('/upload/sign/')) return Response.json({ url: '/object/upload/sign/media/v1/a.png?token=abc' });
    if (url.endsWith('/missing.png')) return new Response('not found', { status: 400 });
    return new Response(PNG, { status: 206 });
  }) as typeof fetch;
  const storage = supabaseStorage({ url: 'https://p.supabase.co/', secretKey: 'sb_secret_example_key_123', bucket: 'media', fetchFn });

  assert.equal(await storage.signUpload('v1/a.png'), 'https://p.supabase.co/storage/v1/object/upload/sign/media/v1/a.png?token=abc');
  assert.equal(seen[0]!.headers.apikey, 'sb_secret_example_key_123');
  assert.equal(storage.publicUrl('v1/a.png'), 'https://p.supabase.co/storage/v1/object/public/media/v1/a.png');
  assert.deepEqual(await storage.measure('v1/a.png'), { width: 2, height: 3 });
  // Measuring reads the public file, with no key.
  assert.equal(seen[1]!.headers.apikey, undefined);
  assert.equal(await storage.measure('v1/missing.png'), null);
});
