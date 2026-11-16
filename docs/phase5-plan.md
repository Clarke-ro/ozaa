# Phase 5 plan: the order of work

Started 2026-11-16. One PR per step, each from `main`. A step that changes `api/openapi.yaml` goes first in its own PR. Tick a step here and the BUILD.md box in the same PR. New ideas for making things sturdier go in the last section as they come up.

Connected today: Supabase "Cravins" (migrations 0000–0001), Clerk "Cravins" (development instance), Heroku (new app for the server; the existing app is not touched), Paystack (test key), Sentry, Vercel.

## A. Sign-in moves to Clerk

1. [x] **Contract PR**: `ownerAuth` is Clerk's session token. Owner codes, refresh, log-out and phone change leave the contract. `GET /me` gives 403 `not_staff`. PIN sign-in returns a one-time Clerk token. App: `src/lib/auth/ownerAuth.ts` seam with a mock stand-in.
2. [x] **Clerk set-up** (development instance, done 2026-11-16): phone code sign-in only, no password or email, sign-ups restricted so only numbers the server invites can sign in, Google and Apple off. _Still to do with the Clerk screens: the allowed app origins and Ghana-only phone numbers._
3. [x] **Clerk screens in the app**: `@clerk/clerk-expo` behind the seam on our own screens (custom flows). Clerk loads only on owner routes, so the guest web bundle stays the same size (check with `expo export`). Phone change through Clerk. Publishable key in `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`.

## B. Server: the contract, exactly (BUILD.md 5.2)

4. [ ] **Tables for everything in the contract**: venues, tables, menu, orders, lines, quotes, waiter calls, staff, loyalty facts, reviews, feedback, promos, notifications, links, devices, settings. One migration, Row Level Security on every table, no public read.
5. [ ] **Seed from `api/fixtures/`**: the three sample venues, menus and staff, so the server and the mock start the same.
6. [ ] **Contract test harness**: load `openapi.yaml`, check every response body against its schema, and fail if any `operationId` has no test. Runs on PGlite like the payment tests.
7. [ ] **Who is calling**: Clerk token check (`@clerk/backend`, offline with Clerk's public key), guest tokens (signed, bound to one venue and table, 4 hours), loyalty tokens.
8. [ ] **Who may do what**: one table of operation → roles, from `StaffRole` in the contract. Tests: every owner call × every role, and staff of venue A get 403 on venue B's venue, orders, tables, calls, menu and loyalty (audit N6).
9. [ ] **Guest calls**: guest session, venue, menu (ETag), wifi, offers, orders, bill quote (server works out money, tax, promos and the Paystack fee), waiter calls, reviews, feedback, game.
10. [ ] **Payments on the real bill**: `POST /payments` reads the quote from the database; the sandbox quote header goes away.
11. [ ] **Owner: venue and menu**: venue, theme, services, staff (creates the Clerk user on invite, revokes Clerk sessions on sign-out), categories, items, tables and QR.
12. [ ] **Owner: running the room**: orders, status, manual payment, waiter calls, floor, dashboard, notifications.
13. [ ] **Owner: money and numbers**: payment settings (encrypted keys, 5.4), fees, transactions, refunds, sales, insights.
14. [ ] **Owner: guests and the rest**: loyalty (programme, members, confirm, scan, stamp), reviews, feedback, custom links, business and locations, devices, promos, profile, delete account.

## C. Hosting

15. [x] **Heroku app for the server**: `cravins-api` (EU, Basic dyno), `Procfile` with `release: npm run db:migrate`, `GET /v1/health`, clean shutdown. First deploy 2026-11-16 (release v9, migrations 0000–0002 on Supabase). `.github/workflows/deploy-server.yml` deploys `server/` on each merge to `main` with the `HEROKU_API_KEY` secret.
16. [ ] **Sentry on the server**, with personal data scrubbed the same way as `src/log.ts`.
17. [x] **CI job for `server/`**: typecheck and tests on every PR.

## D. Still open from earlier phases

18. [ ] **2.10 fee screens**: the owner switch and share on Integrations > Payments, and the fee line on Pay and on the receipt.

## Then

5.3 rate limits and idempotency store, 5.4 money (per-venue keys and webhooks, reconciliation on Heroku Scheduler), 5.5 media, 5.6 staging switch, 5.7 privacy.

## Questions for Clarke

- **Loyalty sign-up codes.** Guests joining loyalty still prove their phone with `POST /auth/otp/*`, which needs an SMS sender on the server. Choice: (a) Clerk for guests too: one SMS provider, but Clerk loads on the guest web page and every member counts as a Clerk user; or (b) Arkesel for loyalty codes only. _Default until you answer: the loyalty calls stay as they are._
- **Number probing.** The old contract answered the same whether or not a number was known. Clerk's sign-in says when a number has no account. Fine for staff sign-in, but worth knowing.

## Improvements to make things sturdier (added as we go)

- Request id on every response and log line, so a guest's "it failed" can be found.
- Body size limit and secure headers on the server.
- Graceful shutdown on Heroku's SIGTERM, so a deploy doesn't cut a payment in half.
- Postgres pool sized for one Basic dyno and Supabase's pooler.
- Run Supabase's security advisors after every migration.
- One `problem()` helper for every error, matching `Problem` in the contract.
- Proactive Clerk token refresh every 50 s, so the first call after a minute doesn't need a retry.
