/**
 * Link previews for a venue's page. WhatsApp, Facebook and the like read only the page's HTML,
 * never its JavaScript, so a shared menu link would show the plain "Cravins" card. A Vercel
 * middleware (middleware.ts at the repo root) uses these to answer those bots, and only them,
 * with the venue's own name, line and photo. Guests' browsers never go through it.
 */

// The apps that fetch a page to draw a link preview. Search engines are left out on purpose:
// they run the app's JavaScript and get the same page everyone does.
const PREVIEW_BOTS =
  /WhatsApp|facebookexternalhit|Facebot|Twitterbot|TelegramBot|Slackbot|LinkedInBot|Discordbot|Pinterest|SkypeUriPreview|redditbot|Embedly/i;

export function isPreviewBot(userAgent: string | null): boolean {
  return Boolean(userAgent && PREVIEW_BOTS.test(userAgent));
}

// First path parts that are never a venue: the owner app, dev pages and static files.
const NOT_VENUES = new Set([
  'owner',
  'dev',
  '_expo',
  'assets',
  'icons',
  'sample',
  'favicon.ico',
  'manifest.json',
  'robots.txt',
  'index.html',
]);

/** The venue slug for its own page (/mamas-kitchen) or a table page (/mamas-kitchen/t/12), else null. */
export function venueSlugFromPath(path: string): string | null {
  const match = /^\/([a-z0-9]+(?:-[a-z0-9]+)*)(?:\/t\/[^/]+)?\/?$/.exec(path);
  const slug = match?.[1];
  return slug && !NOT_VENUES.has(slug) ? slug : null;
}

export type Preview = { title: string; description: string; image: string };

type VenueBits = {
  name: string;
  tagline?: string;
  description?: Record<string, string>;
  banner?: { url: string } | null;
  logo?: { url: string } | null;
};

/** What a venue's preview says: its name, its line (or description), its banner (or logo). */
export function previewFor(venue: VenueBits): Preview {
  const line =
    venue.tagline?.trim() || venue.description?.en?.trim() || 'Order and pay from your table.';
  const image = venue.banner?.url || venue.logo?.url || 'https://cravins-landing.vercel.app/og.png';
  return { title: `${venue.name} · Cravins`, description: line.slice(0, 200), image };
}

const escape = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** The page with its title and preview tags swapped for the venue's. Owner-typed text is escaped. */
export function injectPreview(html: string, preview: Preview): string {
  const set = (attr: string, name: string, value: string) => (page: string) =>
    page.replace(
      new RegExp(`(<meta ${attr}="${name}" content=")[^"]*(")`),
      (_m, start: string, end: string) => `${start}${escape(value)}${end}`,
    );
  return [
    set('property', 'og:title', preview.title),
    set('property', 'og:description', preview.description),
    set('property', 'og:image', preview.image),
    set('name', 'description', preview.description),
  ].reduce(
    (page, apply) => apply(page),
    html.replace(/<title>[^<]*<\/title>/, `<title>${escape(preview.title)}</title>`),
  );
}
