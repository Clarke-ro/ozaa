// Plain checks, no validation library: zod (even zod/mini) pulled every one of its languages into
// the guest web bundle, about 96 KB gzipped on every page, for a dozen settings (audit, 2026-11-17).

/** Each setting's default. An empty value in .env means "not set", so the default applies. */
const DEFAULTS = {
  EXPO_PUBLIC_API_MODE: 'mock' as 'mock' | 'http',
  EXPO_PUBLIC_API_URL: 'http://localhost:4000/v1',
  EXPO_PUBLIC_MOCK_LATENCY_MS: 400,
  EXPO_PUBLIC_MOCK_FAIL_RATE: 0,
  EXPO_PUBLIC_MOCK_FAST: '0' as '0' | '1',
  /** Where guest links point when the app is not running on a web page (native share). */
  EXPO_PUBLIC_SITE_URL: 'https://cravins.app',
  /**
   * Map tiles for the Business page, with {z}/{x}/{y}. OpenStreetMap's own server is fine for
   * light use with credit shown; a busy launch needs a tile provider (Clarke's choice).
   */
  EXPO_PUBLIC_MAP_TILES: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  /** Help page "Email us" (Clarke, 2026-11-14). Override in the build settings. */
  EXPO_PUBLIC_SUPPORT_EMAIL: 'support@cravins.app',
  /**
   * Help page "WhatsApp us", digits with the country code. A DEMO number until Clarke has the
   * real support line: replace it in the build settings before launch.
   */
  EXPO_PUBLIC_SUPPORT_WHATSAPP: '233200000000',
  /**
   * Clerk's publishable key (pk_test_… or pk_live_…) for owner and staff sign-in in real-server
   * builds. It's meant to be public: it only names our Clerk app. The secret key lives on the
   * server only. Empty in mock builds, which sign in with the demo code instead.
   */
  EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: '',
  /**
   * Real-server builds: the demo build's address (e.g. https://cravins-demo.vercel.app), so the
   * start page can offer the sample restaurants without ordering at a real venue. Empty: no link.
   */
  EXPO_PUBLIC_DEMO_URL: '',
  /**
   * Error monitoring (Sentry) for real-server web builds. A DSN only lets you send errors, so it
   * is meant to be public. Empty: no reports.
   */
  EXPO_PUBLIC_SENTRY_DSN: '',
};

export type Env = typeof DEFAULTS;

type Source = Partial<Record<keyof Env, string | undefined>>;

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
  EXPO_PUBLIC_SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
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

function oneOf<T extends string>(name: string, value: string, allowed: readonly T[]): T {
  if (!(allowed as readonly string[]).includes(value))
    throw new Error(`${name} must be one of ${allowed.join(', ')}`);
  return value as T;
}

function number(name: string, value: string, min = -Infinity, max = Infinity): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max)
    throw new Error(`${name} must be a number from ${min} to ${max}`);
  return n;
}

function url(name: string, value: string): string {
  try {
    new URL(value);
  } catch {
    throw new Error(`${name} is not a URL: "${value}"`);
  }
  return value;
}

/** The settings with defaults filled in and each one checked. Throws, naming the setting, if one is wrong. */
function parseEnv(source: Source): Env {
  const out: Env = { ...DEFAULTS };
  const given = (name: keyof Env) => source[name] || undefined;
  const mode = given('EXPO_PUBLIC_API_MODE');
  if (mode)
    out.EXPO_PUBLIC_API_MODE = oneOf('EXPO_PUBLIC_API_MODE', mode, ['mock', 'http'] as const);
  const latency = given('EXPO_PUBLIC_MOCK_LATENCY_MS');
  if (latency) out.EXPO_PUBLIC_MOCK_LATENCY_MS = number('EXPO_PUBLIC_MOCK_LATENCY_MS', latency);
  const failRate = given('EXPO_PUBLIC_MOCK_FAIL_RATE');
  if (failRate)
    out.EXPO_PUBLIC_MOCK_FAIL_RATE = number('EXPO_PUBLIC_MOCK_FAIL_RATE', failRate, 0, 1);
  const fast = given('EXPO_PUBLIC_MOCK_FAST');
  if (fast) out.EXPO_PUBLIC_MOCK_FAST = oneOf('EXPO_PUBLIC_MOCK_FAST', fast, ['0', '1'] as const);
  const site = given('EXPO_PUBLIC_SITE_URL');
  if (site) out.EXPO_PUBLIC_SITE_URL = url('EXPO_PUBLIC_SITE_URL', site);
  for (const name of [
    'EXPO_PUBLIC_API_URL',
    'EXPO_PUBLIC_MAP_TILES',
    'EXPO_PUBLIC_SUPPORT_EMAIL',
    'EXPO_PUBLIC_SUPPORT_WHATSAPP',
    'EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'EXPO_PUBLIC_DEMO_URL',
    'EXPO_PUBLIC_SENTRY_DSN',
  ] as const) {
    const value = given(name);
    if (value) out[name] = value;
  }
  return out;
}

export function readEnv(
  source: Source = fromBuild,
  production = process.env.NODE_ENV === 'production',
): Env {
  const parsed = parseEnv(source);
  if (parsed.EXPO_PUBLIC_API_MODE === 'http') checkApiUrl(parsed.EXPO_PUBLIC_API_URL, production);
  return parsed;
}

export const env = readEnv();
