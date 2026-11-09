import { z } from 'zod';

const schema = z.object({
  // Sandbox only (BUILD.md 2b): a live key (sk_live_…) is refused, so real money can't move.
  PAYSTACK_SECRET_KEY: z
    .string({ error: 'PAYSTACK_SECRET_KEY is missing. Put your Paystack test secret key in server/.env.' })
    .startsWith('sk_test_', { error: 'PAYSTACK_SECRET_KEY must be a test key (sk_test_…).' }),
  PORT: z.coerce.number().int().positive().default(4000),
  // Where Paystack sends a card payer back: {SITE_URL}/{venueSlug}/pay (api/openapi.yaml).
  SITE_URL: z.url().default('http://localhost:8081'),
  // Browsers allowed to call this server, comma separated.
  ALLOWED_ORIGINS: z
    .string()
    .default('http://localhost:8081')
    .transform((s) => s.split(',').map((x) => x.trim()).filter(Boolean)),
});

export type Config = z.infer<typeof schema>;

/** Reads server/.env. Errors name the setting, never its value, so the key never lands in a log. */
export function readConfig(env: Record<string, string | undefined> = process.env): Config {
  const parsed = schema.safeParse(env);
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join('\n'));
  return parsed.data;
}
