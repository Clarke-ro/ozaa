import { z } from 'zod';

const schema = z.object({
  // Optional, sandbox only. Payments use each venue's own keys (Settings > Integrations); these
  // two only connect the sample venues while SEED_SAMPLES=true, so a test payment can be tried
  // before any owner signs in. A live key (sk_live_…) is refused, so real money can't move.
  PAYSTACK_SECRET_KEY: z
    .string()
    .startsWith('sk_test_', { error: 'PAYSTACK_SECRET_KEY must be a test key (sk_test_…).' })
    .optional(),
  PAYSTACK_PUBLIC_KEY: z
    .string()
    .startsWith('pk_test_', { error: 'PAYSTACK_PUBLIC_KEY must be a test key (pk_test_…).' })
    .optional(),
  // Seals each venue's Paystack secret key in the database (src/secrets/sealed.ts). 64 hex
  // characters. Losing or changing it means every venue has to connect Paystack again.
  ENCRYPTION_KEY: z
    .string({
      error:
        'ENCRYPTION_KEY is missing. Put 64 random hex characters in server/.env (openssl rand -hex 32).',
    })
    .regex(/^[0-9a-fA-F]{64}$/, {
      error: 'ENCRYPTION_KEY must be 64 hex characters (openssl rand -hex 32).',
    }),
  // Postgres, e.g. Supabase's pooled connection string (Project Settings > Database). Holds a
  // password, so it lives in server/.env and Vercel's settings, never in git or a log.
  DATABASE_URL: z
    .string({
      error: 'DATABASE_URL is missing. Put your Postgres connection string in server/.env.',
    })
    .regex(/^postgres(ql)?:\/\//, {
      error: 'DATABASE_URL must start with postgres:// or postgresql://.',
    }),
  // Connections this process keeps open. Supabase's session pooler on a small plan is often 15,
  // so 10 leaves room for a migration. Raise it only after checking that pooler's limit.
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(20).default(10),
  // Signs guest tokens (src/guest/token.ts). A long random string; changing it ends every visit.
  GUEST_TOKEN_SECRET: z
    .string({ error: 'GUEST_TOKEN_SECRET is missing. Put a long random string in server/.env.' })
    .min(32, { error: 'GUEST_TOKEN_SECRET must be at least 32 characters.' }),
  // Clerk's secret key (sk_test_… for the development instance). Checks owner and staff sign-ins.
  // Without it the server still serves guests, and owner calls answer "sign-in not set up".
  CLERK_SECRET_KEY: z
    .string()
    .startsWith('sk_', { error: 'CLERK_SECRET_KEY must start with sk_.' })
    .optional(),
  // Supabase Storage for owner photo uploads (src/media/storage.ts). The URL is public; the secret
  // key (sb_secret_… or the service_role key) signs one-file upload URLs and stays on the server.
  // Without both, uploads answer "not set up" and everything else works.
  SUPABASE_URL: z.url().optional(),
  SUPABASE_SECRET_KEY: z.string().min(20).optional(),
  MEDIA_BUCKET: z.string().default('media'),
  // Error monitoring (Sentry). Off without it. A DSN only lets you send errors, so it isn't a secret.
  SENTRY_DSN: z.url().optional(),
  SENTRY_ENVIRONMENT: z.string().default('production'),
  // Arkesel SMS, for the codes guests get when joining loyalty. The sender ID must be approved in
  // Arkesel's dashboard. SMS_DAILY_LIMIT caps texts per day as a cost fuse.
  ARKESEL_API_KEY: z.string().min(8).optional(),
  ARKESEL_SENDER_ID: z.string().min(3).max(11).default('Cravins'),
  SMS_DAILY_LIMIT: z.coerce.number().int().positive().default(300),
  PORT: z.coerce.number().int().positive().default(4000),
  // Where Paystack sends a card payer back: {SITE_URL}/{venueSlug}/pay (api/openapi.yaml).
  SITE_URL: z.url().default('http://localhost:8081'),
  // Browsers allowed to call this server, comma separated.
  ALLOWED_ORIGINS: z
    .string()
    .default('http://localhost:8081')
    .transform((s) =>
      s
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean),
    ),
});

export type Config = z.infer<typeof schema>;

/** Reads server/.env. Errors name the setting, never its value, so the key never lands in a log. */
export function readConfig(env: Record<string, string | undefined> = process.env): Config {
  const parsed = schema.safeParse(env);
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join('\n'));
  return parsed.data;
}

/** Only the database address, for `npm run db:migrate`, which needs nothing else. */
export function readDatabaseUrl(env: Record<string, string | undefined> = process.env): string {
  const parsed = schema.pick({ DATABASE_URL: true }).safeParse(env);
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join('\n'));
  return parsed.data.DATABASE_URL;
}
