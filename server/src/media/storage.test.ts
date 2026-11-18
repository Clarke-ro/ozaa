import { test } from 'node:test';
import assert from 'node:assert/strict';
import { supabaseStorage } from './storage.ts';

// A 2×3 PNG: the signature, then the IHDR chunk that holds the size.
const PNG = Buffer.from('89504e470d0a1a0a0000000d494844520000000200000003080600000000', 'hex');

test('Supabase: signs a one-file upload, and only accepts a real photo under 5 MB', async () => {
  const seen: { url: string; method: string; headers: Record<string, string> }[] = [];
  const fetchFn = (async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    seen.push({ url, method, headers: (init?.headers ?? {}) as Record<string, string> });
    if (url.includes('/upload/sign/')) return Response.json({ url: '/object/upload/sign/media/v1/a.png?token=abc' });
    if (method === 'DELETE') return new Response(null, { status: 200 });
    if (url.endsWith('/missing.png')) return new Response('not found', { status: 400 });
    if (url.endsWith('/nohead.png') && method === 'HEAD') return new Response(null, { status: 400 });
    if (url.endsWith('/big.png')) {
      return new Response(null, { status: 200, headers: { 'content-type': 'image/png', 'content-length': '6000000' } });
    }
    if (url.endsWith('/page.png')) {
      return new Response('<html></html>', {
        status: 200,
        headers: { 'content-type': 'image/png', 'content-length': '13' },
      });
    }
    const headers = { 'content-type': 'image/png', 'content-length': String(PNG.length) };
    if (method === 'HEAD') return new Response(null, { status: 200, headers });
    return new Response(PNG, { status: 206, headers: { ...headers, 'content-range': `bytes 0-${PNG.length - 1}/${PNG.length}` } });
  }) as typeof fetch;
  const storage = supabaseStorage({ url: 'https://p.supabase.co/', secretKey: 'sb_secret_example_key_123', bucket: 'media', fetchFn });

  assert.equal(await storage.signUpload('v1/a.png'), 'https://p.supabase.co/storage/v1/object/upload/sign/media/v1/a.png?token=abc');
  assert.equal(seen[0]!.headers.apikey, 'sb_secret_example_key_123');
  assert.equal(storage.publicUrl('v1/a.png'), 'https://p.supabase.co/storage/v1/object/public/media/v1/a.png');
  assert.deepEqual(await storage.inspect('v1/a.png', 'image/png'), { ok: true, width: 2, height: 3 });
  // HEAD can fail on a file that GET still serves. That photo is still accepted.
  assert.deepEqual(await storage.inspect('v1/nohead.png', 'image/png'), { ok: true, width: 2, height: 3 });
  // Reading the public file uses no key.
  assert.equal(seen.find((call) => call.method === 'GET')!.headers.apikey, undefined);
  assert.deepEqual(await storage.inspect('v1/missing.png', 'image/png'), { ok: false, reason: 'missing' });
  assert.deepEqual(await storage.inspect('v1/big.png', 'image/png'), { ok: false, reason: 'rejected' });
  // A file that claims to be a PNG and is not one.
  assert.deepEqual(await storage.inspect('v1/page.png', 'image/png'), { ok: false, reason: 'rejected' });
  assert.deepEqual(await storage.inspect('v1/a.png', 'text/html'), { ok: false, reason: 'rejected' });
});
