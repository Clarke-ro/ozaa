// zod/mini: the same checks as zod, in a form that tree-shakes to a few KB on the guest web bundle.
import { z } from 'zod/mini';

const schema = z.object({
  EXPO_PUBLIC_API_MODE: z._default(z.enum(['mock', 'http']), 'mock'),
  EXPO_PUBLIC_API_URL: z._default(z.string(), 'http://localhost:4000/v1'),
  EXPO_PUBLIC_API_LIVE: z._default(z.string(), ''),
  EXPO_PUBLIC_MOCK_LATENCY_MS: z._default(z.coerce.number(), 400),
  EXPO_PUBLIC_MOCK_FAIL_RATE: z._default(z.coerce.number().check(z.gte(0), z.lte(1)), 0),
  EXPO_PUBLIC_MOCK_FAST: z._default(z.enum(['0', '1']), '0'),
  /** Where guest links point when the app is not running on a web page (native share). */
  EXPO_PUBLIC_SITE_URL: z._default(z.string().check(z.url()), 'https://cravins.app'),
});

export type Env = z.infer<typeof schema> & { live: string[] };

type Source = Partial<Record<keyof z.infer<typeof schema>, string | undefined>>;

/**
 * Expo copies an EXPO_PUBLIC_ value into the app only where the code spells out
 * `process.env.EXPO_PUBLIC_NAME` in full. Reading them off `process.env` as an object
 * compiles to nothing in a build, so each one is named here.
 */
const fromBuild: Source = {
  EXPO_PUBLIC_API_MODE: process.env.EXPO_PUBLIC_API_MODE,
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
  EXPO_PUBLIC_API_LIVE: process.env.EXPO_PUBLIC_API_LIVE,
  EXPO_PUBLIC_MOCK_LATENCY_MS: process.env.EXPO_PUBLIC_MOCK_LATENCY_MS,
  EXPO_PUBLIC_MOCK_FAIL_RATE: process.env.EXPO_PUBLIC_MOCK_FAIL_RATE,
  EXPO_PUBLIC_MOCK_FAST: process.env.EXPO_PUBLIC_MOCK_FAST,
  EXPO_PUBLIC_SITE_URL: process.env.EXPO_PUBLIC_SITE_URL,
};

export function readEnv(source: Source = fromBuild): Env {
  // An empty value in .env means "not set", so the default applies.
  const blankToUnset = Object.fromEntries(
    Object.entries(source).map(([name, value]) => [name, value || undefined]),
  );
  const parsed = schema.parse(blankToUnset);
  return {
    ...parsed,
    live: parsed.EXPO_PUBLIC_API_LIVE.split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  };
}

export const env = readEnv();
