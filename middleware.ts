import { injectPreview, isPreviewBot, previewFor, venueSlugFromPath } from './src/lib/sharePreview';

/**
 * Vercel Routing Middleware: when a link-preview bot (WhatsApp, Facebook…) fetches a venue's
 * page, answer with that venue's name, line and photo in the preview tags. Everyone else, and
 * any failure along the way, gets the normal app untouched (returning nothing passes through).
 */
export const config = {
  // Never the app's files, the owner app or the dev pages.
  matcher: '/((?!_expo|assets|icons|sample|owner|dev).*)',
};

// A bot that waits too long shows no preview at all, so give up quickly and serve the plain page.
const LOOKUP_MS = 2000;

export default async function middleware(request: Request): Promise<Response | undefined> {
  if (!isPreviewBot(request.headers.get('user-agent'))) return undefined;
  const url = new URL(request.url);
  const slug = venueSlugFromPath(url.pathname);
  const api = process.env.EXPO_PUBLIC_API_URL;
  // The demo has no server to ask; it keeps the plain Cravins card.
  if (!slug || !api || process.env.EXPO_PUBLIC_API_MODE !== 'http') return undefined;
  try {
    const [venue, page] = await Promise.all([
      fetch(`${api.replace(/\/+$/, '')}/venues/${slug}`, {
        signal: AbortSignal.timeout(LOOKUP_MS),
      }),
      fetch(new URL('/index.html', url), { signal: AbortSignal.timeout(LOOKUP_MS) }),
    ]);
    if (!venue.ok || !page.ok) return undefined;
    const html = injectPreview(await page.text(), previewFor(await venue.json()));
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch {
    return undefined;
  }
}
