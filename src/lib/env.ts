// zod/mini: the same checks as zod, in a form that tree-shakes to a few KB on the guest web bundle.
import { z } from 'zod/mini';

const schema = z.object({
  EXPO_PUBLIC_API_MODE: z._default(z.enum(['mock', 'http']), 'mock'),
  EXPO_PUBLIC_API_URL: z._default(z.string(), 'http://localhost:4000/v1'),
  EXPO_PUBLIC_MOCK_LATENCY_MS: z._default(z.coerce.number(), 400),
  EXPO_PUBLIC_MOCK_FAIL_RATE: z._default(z.coerce.number().check(z.gte(0), z.lte(1)), 0),
  EXPO_PUBLIC_MOCK_FAST: z._default(z.enum(['0', '1']), '0'),
  /** Where guest links point when the app is not running on a web page (native share). */
  EXPO_PUBLIC_SITE_URL: z._default(z.string().check(z.url()), 'https://cravins.app'),
  /**
   * Map tiles for the Business page, with {z}/{x}/{y}. OpenStreetMap's own server is fine for
   * light use with credit shown; a busy launch needs a tile provider (Clarke's choice).
   */
  EXPO_PUBLIC_MAP_TILES: z._default(z.string(), 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'),
  /** Help page "Email us" (Clarke, 2026-11-14). Override in the build settings. */
  EXPO_PUBLIC_SUPPORT_EMAIL: z._default(z.string(), 'support@cravins.app'),
  /**
   * Help page "WhatsApp us", digits with the country code. A DEMO number until Clarke has the
   * real support line: replace it in the build settings before launch.
   */
  EXPO_PUBLIC_SUPPORT_WHATSAPP: z._default(z.string(), '233200000000'),
  /**
   * Clerk's publishable key (pk_test_… or pk_live_…) for owner and staff sign-in in real-server
   * builds. It's meant to be public: it only names our Clerk app. The secret key lives on the
   * server only. Empty in mock builds, which sign in with the demo code instead.
   */
  EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: z._default(z.string(), ''),
  /**
   * Real-server builds: the demo build's address (e.g. https://cravins-demo.vercel.app), so the
   * start page can offer the sample restaurants without ordering at a real venue. Empty: no link.
   */
  EXPO_PUBLIC_DEMO_URL: z._default(z.string(), ''),
});

export type Env = z.infer<typeof schema>;

type Source = Partial<Record<keyof z.infer<typeof schema>, string | undefined>>;

/**
 * Expo copies an EXPO_PUBLIC_ value into the app only where the code spells out
 * `process.env.EXPO_PUBLIC_NAME` in full. Reading them off `process.env` as an object
 * compiles to nothing in a build, so each one is named here.
 */
const fromBuild: Source = {
  EXPO_PUBLIC_API_MODE: process.env.EXPO_PUBLIC_API_MODE,
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
  EXPO_PUBLIC_MOCK_LATENCY_MS: process.env.EXPO_PUBLIC_MOCK_LATENCY_MS,
  EXPO_PUBLIC_MOCK_FAIL_RATE: process.env.EXPO_PUBLIC_MOCK_FAIL_RATE,
  EXPO_PUBLIC_MOCK_FAST: process.env.EXPO_PUBLIC_MOCK_FAST,
  EXPO_PUBLIC_SITE_URL: process.env.EXPO_PUBLIC_SITE_URL,
  EXPO_PUBLIC_MAP_TILES: process.env.EXPO_PUBLIC_MAP_TILES,
  EXPO_PUBLIC_SUPPORT_EMAIL: process.env.EXPO_PUBLIC_SUPPORT_EMAIL,
  EXPO_PUBLIC_SUPPORT_WHATSAPP: process.env.EXPO_PUBLIC_SUPPORT_WHATSAPP,
  EXPO_PUBLIC_DEMO_URL: process.env.EXPO_PUBLIC_DEMO_URL,
  EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
};

const LOCAL = /^(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+)$/;

/**
 * A real-server build must point somewhere real. While developing, a local server is fine; a
 * production build must use https and not localhost, or every phone would call itself and fail.
 */
function checkApiUrl(url: string, production: boolean): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`EXPO_PUBLIC_API_URL is not a URL: "${url}"`);
  }
  if (!production) return;
  if (LOCAL.test(parsed.hostname))
    throw new Error(
      'EXPO_PUBLIC_API_URL points at this machine; set the real server for a release',
    );
  if (parsed.protocol !== 'https:')
    throw new Error('EXPO_PUBLIC_API_URL must use https in a release build');
}

export function readEnv(
  source: Source = fromBuild,
  production = process.env.NODE_ENV === 'production',
): Env {
  // An empty value in .env means "not set", so the default applies.
  const blankToUnset = Object.fromEntries(
    Object.entries(source).map(([name, value]) => [name, value || undefined]),
  );
  const parsed = schema.parse(blankToUnset);
  if (parsed.EXPO_PUBLIC_API_MODE === 'http') checkApiUrl(parsed.EXPO_PUBLIC_API_URL, production);
  return parsed;
}

export const env = readEnv();
