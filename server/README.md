# Cravins server

Phase 5 has started (BUILD.md section 13). The server runs on Postgres: Supabase in production, a local Postgres or PGlite while building. It runs on Heroku as the app `cravins-api` (BUILD.md section 4). So far it has the Paystack sandbox slice from 2b, now storing payments in Postgres.

## Payments (from the 2b sandbox slice)

The only server code before the UI approval gate. It does four things, exactly as `api/openapi.yaml` describes them:

| Route | What it does |
|---|---|
| `POST /v1/payments` | Starts a MoMo charge or a card checkout with Paystack |
| `GET /v1/payments/{reference}` | The payment as we know it, refreshed from Paystack every 5 s while open |
| `POST /v1/payments/{reference}/verify` | Asks Paystack now |
| `POST /v1/webhooks/paystack` | Paystack's messages, believed only when signed with the secret key |

Only Paystack's "success" for the same amount and currency (GHS) makes a payment `succeeded`.

## Run it

1. `cp .env.example .env`. Then fill it in:
   - your Paystack **test** secret key. A live key (`sk_live_`) is refused.
   - `DATABASE_URL`: your Supabase pooled connection string, or a local Postgres.
2. `npm install`, then `npm run db:migrate` to create the tables. Run it again after every schema change; it's safe to repeat.
3. `npm run dev`. It listens on http://localhost:4000/v1.
4. In the app's root `.env`, set `EXPO_PUBLIC_API_LIVE=payments` and start the app (`npx expo start --web`). Payment calls go to this server; everything else stays on the mock.
5. Pay at Bean There (`/bean-there/t/7`) with Paystack's test MoMo numbers or test cards from the Paystack docs.

`npm test` runs the tests. They use PGlite, a real Postgres inside Node, so no database or Paystack is needed. `npm run typecheck` checks the types.

## The database

- **Tables** are defined in `src/db/schema.ts`. After changing it, run `npm run db:generate`. That writes a new SQL file in `drizzle/`; commit it with the change. `npm run db:migrate` applies it.
- **Migrations run as their own step**, never when the server starts. Two copies of the server starting together could otherwise both try to change the tables.
- **No double charges.** A payment's `Idempotency-Key` is unique in the table. A second tap, even one that reaches another copy of the server, gets the first payment back.

## Deploying to Heroku

Heroku is connected to this GitHub repo and deploys `main` by itself, after CI passes:

1. Heroku takes the repo. A small buildpack (`heroku-buildpack-monorepo`, with `APP_BASE=server`) keeps only `server/`, so the app at the repo root isn't built.
2. The Node buildpack installs and builds the server.
3. Heroku's **release phase** runs `npm run db:migrate` (`Procfile`). If a migration fails, the new version doesn't go live and the old one keeps running.

Check a deploy at https://cravins-api-c62d81d926d2.herokuapp.com/v1/health. It says `ok` when the server is up and the database answers.

The app runs on one **Basic** dyno ($7/month, always on).

One-time set-up, done by Clarke:

- **Buildpacks** (`cravins-api` > Settings > Buildpacks), in this order: `https://github.com/lstoll/heroku-buildpack-monorepo`, then `heroku/nodejs`.
- **Config Vars** (Settings > Config Vars): `APP_BASE` = `server`. Also `DATABASE_URL` (Supabase **Session pooler** address, not `db.….supabase.co`, which is IPv6 only), `PAYSTACK_SECRET_KEY` (`sk_test_…`) and `CLERK_SECRET_KEY` (`sk_test_…`). `NODE_ENV`, `SITE_URL`, `ALLOWED_ORIGINS` and `CLERK_PUBLISHABLE_KEY` are already set.
- **GitHub** (Deploy tab): Deployment method GitHub, connect `Clarke-ro/ozaa`, then under Automatic deploys pick `main`, tick **Wait for CI to pass before deploy**, and click Enable Automatic Deploys.

On a deploy or Heroku's daily restart, the server gets SIGTERM. It stops taking new requests, lets the ones in flight finish, then closes the database.

## Know before you test

- **The amount comes from the app.** The bill still lives in the app's mock, so the app sends the quote in an `X-Cravins-Sandbox-Quote` header. That's only acceptable because the server refuses live keys. Phase 5 removes it: the server works out the bill itself.
- **Card on the web reloads the page.** Coming back from Paystack's card page loads the app fresh, and the in-browser mock forgets the order. The server still has the payment (see the log). MoMo has no page load, so it works end to end.
- **Webhooks need a public address.** Paystack can't reach your laptop. The app checks with verify instead, so this isn't needed to test. To try webhooks, point Paystack's test webhook URL at a tunnel to `/v1/webhooks/paystack`.
- **Telecel may ask for a code** (`send_otp`). This slice doesn't support entering it yet, so test with MTN first.
- **Logs** are one JSON line per event, written through `src/log.ts`. It drops any field named like personal data or a secret, and blanks phone numbers, emails, keys and tokens anywhere else.
