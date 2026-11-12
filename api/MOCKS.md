# Mock API: how the frontend runs before the backend exists

The app talks to one interface, `ApiClient`. In Phases 0–4 that interface is backed by an in-memory mock. In Phase 5 it switches to the real server. Feature code never changes when that happens.

## Files in this folder
- `openapi.yaml`: the contract (OpenAPI 3.1). Check it with `npx @redocly/cli lint api/openapi.yaml`. It currently gives warnings only: some tags have no description and a few operations have no 4xx response.
- `fixtures/*.json`: sample data for the three sample venues: `mamas-kitchen`, `bean-there` and `auntie-akos`. Each file is an object keyed by slug.

  | File | Holds |
  |---|---|
  | `venues.json` | `VenuePublic`: theme, services, hours, loyalty summary |
  | `menus.json` | `Menu` |
  | `offers.json` | offers |
  | `wifi.json` | Wi-Fi details |
  | `leaderboards.json` | game sample scores |
  | `loyaltyCards.json` | Mama's Kitchen at 5 of 8 stamps |
  | `orders.json` | ORDER #24 at Mama's Kitchen, table 12, preparing, ETA 12 min |

- `fixtures/build-fixtures.mjs`: rebuilds the JSON from the HTML prototype (`design/prototype/theme.js`, `venues.js`, `data.js`). Run `node api/fixtures/build-fixtures.mjs` only if the prototype changes.
- `fixtures/check-fixtures.mjs`: validates every fixture against the contract schemas with Ajv (2020-12). Run `npm i -D ajv ajv-formats js-yaml`, then `node api/fixtures/check-fixtures.mjs`. CI runs it.

## In the app
```
src/lib/api/schema.ts      generated: npx openapi-typescript api/openapi.yaml -o src/lib/api/schema.ts
src/lib/api/client.ts      interface ApiClient { getVenue(slug): Promise<VenuePublic>; ... }  one method per operationId
src/lib/api/errors.ts      ApiError (from Problem Details), OfflineError, plus a toMessageKey(error) for i18n
src/lib/api/http.ts        createHttpClient(baseUrl, tokens): joins the http*Calls.ts area files
src/lib/api/httpContext.ts the openapi-fetch client, auth headers, ok() and problem()
src/lib/api/index.ts       export const api = env.API_MODE === 'mock' ? createMockClient() : createHttpClient(...)
src/mocks/mockClient.ts    createMockClient({ latencyMs, failRate, now }): joins the area files below
src/mocks/mockContext.ts   shared state: the world, tokens, clock, gate(), placeOrder(), remember()
src/mocks/mock*Calls.ts    the calls by area (auth, guest, owner venue, orders, loyalty, desk, business)
src/mocks/mockRules.ts     small pure helpers; mockSettle.ts moves a payment along
src/mocks/world.ts         createWorld(): in-memory tables seeded from fixtures (deep-cloned so tests are isolated)
src/mocks/world*.ts        its types, lookups (venueBySlug, findOrder...) and sample data; seedOwnerDesk.ts
src/mocks/media.ts         maps https://mock.cravins.app/media/... to bundled files
src/mocks/fixtures/*.json  copied from api/fixtures by scripts/copy-fixtures.mjs (don't edit the copies)
```

Rules:
- The mock returns the **same shapes and the same errors** as the contract: Problem Details with `code` (for example `order_not_found`, `payment_declined`, `rate_limited`). A test checks the mock responses against `schema.ts` types and the Ajv schemas.
- The mock works out totals itself, like the server will, from `unitPricePesewas` × quantity plus modifiers. The UI shows the mock's totals, never its own sum, except for the live cart estimate before sending.
- Latency is `EXPO_PUBLIC_MOCK_LATENCY_MS` (default 400 ms, ±50% jitter). `EXPO_PUBLIC_MOCK_FAIL_RATE` (default 0) makes random calls fail with a network error so the error states get exercised.
- Idempotency: the mock remembers `Idempotency-Key` → response, so the same key returns the same order or payment.
- ETag: the mock returns `etag` for venue and menu, and answers `304` when unchanged.
- Time comes from an injectable `now()`, so tests can move the clock.

## Media
Fixture URLs look like `https://mock.cravins.app/media/img/jollof.jpg` and `https://mock.cravins.app/media/review-ama.mp4`.
- `src/mocks/media.ts` holds one map from the path after `/media/` to a `require('../../assets/sample/...')`.
- Copy the files from `design/prototype/img/` and `design/prototype/media/`, skipping the two logo SVGs.
- `<VenueImage>` and `<StoryVideo>` resolve URLs through `resolveMedia(url)`, which returns the bundled asset in mock mode and the URL itself in http mode.

These photos and the video are **AI-generated samples**. Show a small "Sample" label in mock mode.

## Simulated flows

| Flow | What the mock does |
|---|---|
| Guest session | `POST /guest-sessions` with a known slug gives a token. An unknown slug gives 404 `venue_not_found`. `tableCode` must be one of the venue's tables (12 for Mama's, 4 for Bean There, 7 for Auntie Akos), or any string `1`–`40`. |
| Order | `POST /orders` creates `received`. Then a timer moves it to `preparing` after 20 s, `ready` after 60 s and `served` after 90 s. Set `EXPO_PUBLIC_MOCK_FAST=1` to divide all times by 10 for demos. `ready` triggers the food-ready banner through polling. |
| Waiter call | `open`, then `acknowledged` after 8 s with `staffFirstName: "Kwesi"`. |
| Bill quote | Implements whole, equal and items, plus tips, exactly as in BUILD.md 13 / 2.1. `expiresAt` = now + 10 min. |
| MoMo payment | `POST /payments` returns `pay_offline` with `displayText: "Check your phone and enter your PIN to approve."` and `approveBy` = now + 180 s. The outcome depends on the **last digit of the phone number**: `0` → `failed` after 5 s (`failureReason: "Not enough money in the wallet."`); `9` → stays `pay_offline` and becomes `abandoned` at `approveBy`; anything else → `succeeded` after 5 s. `testMode: true`. |
| Card payment | Returns `open_url` with `authorizationUrl` set to a local mock page (`/dev/mock-checkout?ref=…&back=/{slug}/pay`) that has Pay and Cancel buttons. Pay → `succeeded`, Cancel → `abandoned`. Both then go back to `/{slug}/pay?reference=…&trxref=…`, as Paystack's callback does. |
| Verify | `POST /payments/{ref}/verify` returns the current state right away. |
| Order after payment | On `succeeded`, add to `paidPesewas`, mark the paid lines (items mode), and set `paymentStatus` to `part_paid` or `paid`. On loyalty-joined sessions, add one stamp. |
| OTP | Any Ghana phone works. The code is always `123456`. A wrong code 3 times gives 429 with `Retry-After: 30`. |
| Owner | `+233240000001` is the owner of Mama's Kitchen, `+233240000002` a waiter, and `+233240000003` kitchen staff. Owner changes (services, theme, menu, order status) update the same in-memory venue, so the guest screens reflect them right away in the same browser. `GET /owner/venues/{id}/dashboard`, `/floor`, `/transactions`, `/written-reviews` and `/insights` are derived from that memory. A refund is the full succeeded amount, once. Insights are marked `sample: true`. Mama's Kitchen starts with table 12 ordered, table 3 waiting to pay, table 4 calling for water, and table 7 seated. |
| Video upload | `POST /video-reviews/uploads` returns a fake pre-signed URL. The mock "upload" just waits 2 s, with progress events every 200 ms. The new review appears in the owner's To check tab. |
| Game | No network in v1. The leaderboard endpoints exist in the contract and the mock, but the app doesn't call them until the shared leaderboard (roadmap). |

## Optional: MSW for web tests
If a Playwright or RNTL test needs to stub the network at the HTTP layer instead of swapping the client, use MSW 3 (`msw`). Build handlers from the same `src/mocks/db.ts` so there is still one source of fake data. This isn't needed for day-to-day work.

## Moving to the real server (Phase 5)
1. The server implements `openapi.yaml` exactly and seeds staging from the same fixtures.
2. Set `EXPO_PUBLIC_API_MODE=http` and `EXPO_PUBLIC_API_URL=https://staging-api…/v1`.
3. Run the whole Playwright suite against staging. Any difference is a server bug or a contract change, which goes in its own PR.
4. Keep the mock: it stays the default for UI work, demos and tests.
