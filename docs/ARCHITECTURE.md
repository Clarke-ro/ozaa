# How Cravins is put together

Last checked: 9 Nov 2026, `main` at `aa9bebb`. This is a map. For the plan and the rules, read `BUILD.md` and `AGENTS.md`.

## The parts

| Part | What it is | Where | How it runs |
|---|---|---|---|
| App | One Expo app (SDK 58, React Native 0.88, Expo Router) for guests and owners. Web for guests, web and Android for owners. | `src/` | `npx expo start --web`; Vercel builds it with `npx expo export -p web` into `dist/` |
| Contract | The fixed API: 75 paths, 91 operations | `api/openapi.yaml` | Types are generated into `src/lib/api/schema.ts` (`npm run gen:api`) |
| Mock API | The whole API in memory, in the app, with sample venues | `src/mocks/` | Default. `EXPO_PUBLIC_API_MODE=mock` |
| Payments sandbox | Hono server for the 3 payment calls and the Paystack webhook, test keys only | `server/` | `cd server && npm run dev`, then `EXPO_PUBLIC_API_LIVE=payments` |
| Landing site | Astro marketing site | `landing/` | Its own Vercel project and CI (`.github/workflows/landing.yml`) |
| Design | Renders to match, brand rules, tokens, logos | `design/` | Not shipped. `design/tokens.json` generates `src/theme/tokens.ts` |

There is no database and no real backend yet. The real server (Postgres, OTP sign-in, push) is Phase 5 in `BUILD.md` and waits for the UI approval gate.

## Folders in `src/`

```
src/
  app/                 routes only (Expo Router). Thin files that render a feature screen.
    [venue]/           guest pages: /mamas-kitchen, /mamas-kitchen/menu, …/t/12 (table QR entry)
    owner/             owner and staff pages, /owner/login
    dev/               UI gallery and mock checkout, mock builds only
  features/<name>/     one folder per feature: screens, hooks, pure logic and tests, with an index.ts
    owner/             the owner app: chrome/ (nav), data/ (hooks), desk/ (pure logic), kit/ (owner UI), screens/<page>/
  ui/                  shared components, theme provider, makeStyles
  theme/               tokens (generated), light and dark palettes, fonts
  lib/                 api client, env, money, phone, time, query keys and other pure helpers
  mocks/               mock API, sample world, fixtures (copied from api/fixtures)
  i18n/                i18next set-up and locale files
```

Import rule (lint enforced): other code imports a feature from `@/features/<name>`, never from inside it.

## Configuration

App settings are read once, checked with zod, in `src/lib/env.ts`. Anything starting `EXPO_PUBLIC_` is built into the app, so it is public.

| Variable | Default | What it does |
|---|---|---|
| `EXPO_PUBLIC_API_MODE` | `mock` | `mock` or `http` |
| `EXPO_PUBLIC_API_URL` | `http://localhost:4000/v1` | Server address in `http` mode, or for live payments |
| `EXPO_PUBLIC_API_LIVE` | empty | `payments` sends the payment calls to `server/` |
| `EXPO_PUBLIC_MOCK_LATENCY_MS`, `_FAIL_RATE`, `_FAST` | 400, 0, 0 | How slow and flaky the mock is, and whether orders move on by themselves quickly |
| `EXPO_PUBLIC_SITE_URL` | `https://cravins.app` | Guest links when the app isn't on a web page |
| `PREVIEWS_ENABLED` | `false` | Shows roadmap previews on sample data (build time, `app.config.ts`) |

Server settings live in `server/.env` (`server/.env.example`): `PAYSTACK_SECRET_KEY` (must be `sk_test_`), `PORT`, `SITE_URL`, `ALLOWED_ORIGINS`.

## How an order flows

```
Guest scans table QR ─► /mamas-kitchen/t/12
   POST /guest-sessions  ─► guest token (one venue, one table, 4 hours)
   GET  /venues/{slug}, /venues/{slug}/menu
   cart (zustand, one venue at a time) ─► POST /orders  (Idempotency-Key, clientOrderId)
        server prices every line from the menu; the guest's estimate is never trusted
   /status polls GET /orders/{id} every 10 s (ETag, 304 when unchanged)

Owner / kitchen  /owner/orders polls GET /owner/venues/{id}/orders every 5 s, chime on new tickets
   PUT /owner/orders/{id}/status   received → preparing → ready → served   (or → cancelled)
   rules: src/features/orders/orderMachine.ts, checked by role

Paying
   POST /orders/{id}/bill         whole | equal | my items, plus tip   → quoteId (10 min)
   POST /payments                 MoMo: pay_offline, 180 s to approve
                                  card: open_url to Paystack, back to /{slug}/pay?reference=…
   GET /payments/{ref}, POST /payments/{ref}/verify   only "succeeded" puts money on the order
   POST /webhooks/paystack        signed with the venue's secret key (HMAC-SHA512)
   or staff mark it paid in person: POST /owner/orders/{id}/manual-payment
```

Menu-link orders (pickup or delivery) come in through `/mamas-kitchen` without a table. They carry name, phone and address on the order only. Rules: `src/lib/onlineOrdering.ts`.

Realtime is polling with React Query. Polling stops when the app is in the background (`src/lib/queryLifecycle.ts`) and catches up on reconnect. There are no push notifications yet (Phase 5).

## Sign-in and roles

| Who | How | Token |
|---|---|---|
| Guest at a table | `POST /guest-sessions` | `guestAuth`, bound to venue and table |
| Guest joining loyalty | phone OTP, purpose `guest_loyalty` | `loyaltyAuth` |
| Owner and staff | phone OTP, purpose `owner_login` | `ownerAuth` access + refresh token |

Owner tokens are saved by `src/features/session/sessionStore.ts` (secure store on a phone, browser storage on the web). `src/app/owner/_layout.tsx` sends anyone without a token to `/owner/login`. `canOpen(role, path)` in `src/features/owner/chrome/nav.ts` decides which pages each role sees: owner, manager, waiter, kitchen, viewer, staff_scanner.

The mock sample login is `0240000001` with code `123456`.

## Data shapes

All shapes are in `api/openapi.yaml` under `components/schemas`, and in TypeScript in `src/lib/api/types.ts`. The main ones:

- **Venue:** `VenuePublic` (what guests see), `VenueSettings` (what owners edit), `VenueTheme`, `OpeningHours`, `ServiceSettings`, `OnlineOrdering`
- **Menu:** `Menu`, `MenuCategory`, `MenuItem` (price, sale price, stock count, min and max per order), `ModifierGroup`
- **Orders:** `Order`, `OrderLine`, `OrderStatus`, `BillQuote`, `Payment`, `PaymentStatus`
- **People:** `StaffUser`, `StaffMember`, `StaffRole`, `LoyaltyCard`, `LoyaltyMember`
- **Money:** always whole pesewas (`Pesewas`, an integer). Currency is per venue; samples are `GHS`.

## Checks

| Command | What it checks |
|---|---|
| `npx tsc --noEmit` | Types (strict, `noUncheckedIndexedAccess`) |
| `npx expo lint` | ESLint (Expo config plus project rules) |
| `npm test` | Jest unit and mock API tests |
| `npx expo export -p web && npx playwright test` | Browser tests on the built web app, 390×844 |
| `cd server && npm test` | Payments sandbox tests (Node test runner, Paystack faked) |
| `npx @redocly/cli lint api/openapi.yaml` | The contract |

CI (`.github/workflows/ci.yml`) runs all of them on every PR, also checks that generated files are up to date, and fails a PR that doesn't target `main`.
