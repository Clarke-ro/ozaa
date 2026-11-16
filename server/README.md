# Cravins server

Phase 5 has started (BUILD.md section 13). The server runs on Postgres: Supabase in production, a local Postgres or PGlite while building. It runs on Heroku as the app `cravins-api` (BUILD.md section 4). So far it has the Paystack sandbox slice from 2b, now storing payments in Postgres, and the guest side of the contract: table and menu-link sessions, venue, menu, Wi-Fi, offers, orders and bill quotes.

## Payments: each restaurant's own Paystack

| Route | What it does |
|---|---|
| `POST /v1/payments` | Starts a MoMo charge or a card checkout for a bill quote |
| `GET /v1/payments/{reference}` | The payment as we know it, refreshed from Paystack every 5 s while open |
| `POST /v1/payments/{reference}/verify` | Asks Paystack now |
| `POST /v1/webhooks/paystack` | Paystack's messages, believed only when signed with that venue's key |

- **The amount comes from the server's quote** (`POST /v1/orders/{id}/bill`), never from the app.
- **Each payment uses the venue's own Paystack secret key**, so the money lands in that restaurant's account. Cravins holds no funds and has no key of its own.
- **The secret key is sealed** with AES-256-GCM using `ENCRYPTION_KEY` (`src/secrets/sealed.ts`). The database alone reveals no keys. Only the last 4 characters are ever shown.
- **Only Paystack's "success" for the same amount** makes a payment `succeeded`. The first success adds the quote's food share to the order and marks its lines paid, once, in one transaction. Tips and the passed-on fee never pay for food.
- **Test keys only.** A venue in live mode can't take payments until Clarke switches live on.

## Guests (Phase 5.2)

| Route | What it does |
|---|---|
| `POST /v1/guest-sessions` | A QR scan (with a table code) or a menu link (without). Returns a signed guest token for 4 hours |
| `GET /v1/venues/{slug}`, `/menu`, `/offers` | Public venue details, menu and offers |
| `GET /v1/venues/{slug}/wifi` | Only for a guest in a session at that venue |
| `POST /v1/orders` | Prices the order on the server (sale prices, add-ons, the best promo, tax, delivery fee), takes stock and saves it. Sending the same `clientOrderId` again returns the first order |
| `GET /v1/orders/{id}` | Your own order, or your table's while it's still open |
| `POST /v1/orders/{id}/bill` | A 10-minute quote for paying: whole, equal split or your items, plus tip and any passed-on Paystack fee |

- **No personal data in a guest session.** The guest token holds a random session id, the venue and the table, signed with `GUEST_TOKEN_SECRET`. The server keeps no session row.
- **Shared rules.** Prices, promos, tax, delivery and bill splitting use the same code as the app. `npm run sync:server-shared` (repo root) copies those files into `src/shared/` and the sample fixtures into `seed/`. Don't edit the copies; CI fails if they drift.
- **Contract tests.** `src/routes/guest.test.ts` checks every reply against `api/openapi.yaml` with `expectContract`.
- **Sample venues.** `npm run db:seed` adds Mama's Kitchen, Bean There and Auntie Akos with tables 1 to 12, but only while `SEED_SAMPLES=true`. It never changes rows that exist.

## Run it

1. `cp .env.example .env`. Then fill it in:
   - `DATABASE_URL`: your Supabase pooled connection string, or a local Postgres.
   - `ENCRYPTION_KEY` and `GUEST_TOKEN_SECRET`: run `openssl rand -hex 32` for each.
   - To try payments before an owner connects Paystack: your **test** keys in `PAYSTACK_SECRET_KEY` and `PAYSTACK_PUBLIC_KEY`, with `SEED_SAMPLES=true`.
2. `npm install`, then `npm run db:migrate` to create the tables and `npm run db:seed` for the sample venues. Both are safe to repeat.
3. `npm run dev`. It listens on http://localhost:4000/v1.
4. In the app's root `.env`, set `EXPO_PUBLIC_API_MODE=http` and start the app (`npx expo start --web`). Every call goes to this server.
5. Scan Mama's Kitchen table 12 (`/mamas-kitchen/t/12`), order, and pay with Paystack's test MoMo number (MTN 0551234987) or test card (4084 0840 8408 4081, CVV 408, any future date).

`npm test` runs the tests. They use PGlite, a real Postgres inside Node, so no database or Paystack is needed. `npm run typecheck` checks the types.

## The database

- **Tables** are defined in `src/db/schema.ts`. After changing it, run `npm run db:generate`. That writes a new SQL file in `drizzle/`; commit it with the change. `npm run db:migrate` applies it.
- **Migrations run as their own step**, never when the server starts. Two copies of the server starting together could otherwise both try to change the tables.
- **No double charges.** A payment's `Idempotency-Key` is unique in the table. A second tap, even one that reaches another copy of the server, gets the first payment back.

## Deploying to Heroku

Every merge to `main` that changes `server/` deploys it (`.github/workflows/deploy-server.yml`):

1. GitHub packs `server/` alone and sends it to Heroku, which installs and builds it.
2. Heroku's **release phase** runs `npm run db:migrate`, then `npm run db:seed` (`Procfile`). If a migration fails, the new version doesn't go live and the old one keeps running.
3. The workflow waits for `GET /v1/health` to say `ok`. That checks the server is up and the database answers.

One-time set-up, done by Clarke:

- **GitHub:** repo Settings > Secrets and variables > Actions > New secret `HEROKU_API_KEY` (from Heroku's Account settings > API key). Until it's set, the deploy fails and says why. The app runs on one **Basic** dyno ($7/month, always on).
- **Heroku:** `cravins-api` > Settings > Config Vars: `DATABASE_URL` (Supabase **Session pooler** address, not `db.….supabase.co`, which is IPv6 only), `PAYSTACK_SECRET_KEY` (`sk_test_…`), `CLERK_SECRET_KEY` (`sk_test_…`), `GUEST_TOKEN_SECRET` and `ENCRYPTION_KEY` (each from `openssl rand -hex 32`), and while testing `SEED_SAMPLES=true` with `PAYSTACK_PUBLIC_KEY` (`pk_test_…`) beside the secret key. `NODE_ENV`, `SITE_URL`, `ALLOWED_ORIGINS` and `CLERK_PUBLISHABLE_KEY` are already set.

On a deploy or Heroku's daily restart, the server gets SIGTERM. It stops taking new requests, lets the ones in flight finish, then closes the database.

## Know before you test

- **Webhooks:** each venue sets its Paystack webhook URL to `https://cravins-api-c62d81d926d2.herokuapp.com/v1/webhooks/paystack` (Paystack dashboard > Settings > API Keys & Webhooks). Without it, payments still finish: the app asks with verify.
- **Telecel may ask for a code** (`send_otp`). Entering it isn't supported yet, so test with MTN first.
- **Logs** are one JSON line per event, written through `src/log.ts`. It drops any field named like personal data or a secret, and blanks phone numbers, emails, keys and tokens anywhere else.
