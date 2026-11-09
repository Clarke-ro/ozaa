# Audit report, 9 Nov 2026

Full audit of Cravins against `main` at `aa9bebb` (later `3384df3`). Work was done in a separate worktree, one small PR per fix, each branched from `main`. Map of the code: `docs/ARCHITECTURE.md`. The earlier hygiene audit (`docs/refactor-audit.md`, 3 Nov) and its decisions D1–D10 still stand; this audit covers what changed since and what that one didn't look at (money, the server, auth, demo data).

**Scope agreed with Clarke before starting:** audit the backend that exists (the mock API and the Paystack sandbox in `server/`) and don't build Phase 5; keep `design/` (the renders are the spec); small PRs.

## 1. What was broken and what was fixed

| PR | Where | Problem | Fix | Rank |
|---|---|---|---|---|
| #72 | `src/features/pay/quoteBill.ts` | After one guest paid an equal share, **Pay the whole bill** asked for the full amount again: "what's left" was the dishes not marked paid, and an equal share marks no dish. | What's left = order total − already paid. | High |
| #72 | same | Online **whole bill** on a delivery order never charged the delivery fee; the order stayed part paid. | Same: the order total includes the fee. | High |
| #72 | same | A dish picked twice in My items was charged twice. | Picked dishes are de-duplicated. | Low |
| #73 | `server/src/payments.ts` | A card payment we marked `abandoned` ignored a later Paystack success, so a guest who came back early and then paid had paid, but the order showed unpaid. | `abandoned` moves on to `succeeded` on a matching success (amount still checked). | High |
| #73 | same | Idempotency key saved only after Paystack answered: two taps together could start two charges. | The pending start is saved under the key first. | Medium |
| #74 | `src/mocks/mockClient.ts` `settle()` | A paid "My items" quote marked the dishes of the **first** quote in memory paid, not its own. | Each payment keeps its `quoteId`. | Medium |
| #76 | `src/lib/api`, `src/features/session` | Owner tokens last an hour and nothing renewed them: on a real server every owner page fails after an hour. Sign out didn't revoke the token on the server. | 401 on an owner call → one shared refresh → retry. Refused refresh → signed out, owner cache wiped. Sign out calls `logout`. | High (before the backend) |
| #78 | mock `placeOrder` | An order with no dishes was accepted (contract says at least one). | 400 `validation`. | Low |
| #79 | web build | No web manifest: "Add to home screen" saved a nameless bookmark. | Manifest, 192/512 icons, iPhone icon, theme colour. | Medium |
| #83 | owner login, landing, game | Sample logins, a pre-filled made-up number, a sample-table button and made-up leaderboard players showed in **every** build, including one on a real server. Two sample labels had the wrong role. | Only in demo builds (`DEMO` in `src/lib/demo.ts`); sample data in `src/mocks/demo.ts`. | Medium |

Tidy-ups: #80 (one place for polling intervals), #81 (dead code), #75 (this report, `ARCHITECTURE.md`, LEARNING entries).

## 2. Endpoints

The contract has **75 paths, 91 operations**. Before and after, the typed client (`src/lib/api/client.ts`), the HTTP client (`http.ts`) and the mock implement **all 91**, and nothing outside the contract. No screen calls an endpoint that doesn't exist. Error shape is the contract's `Problem` everywhere (`application/problem+json` on the server).

The only endpoints a real server answers today are in `server/`: `POST /payments`, `GET /payments/{ref}`, `POST /payments/{ref}/verify`, `POST /webhooks/paystack`. Input is checked with zod; errors are `Problem`; the webhook needs a valid HMAC-SHA512 signature (timing-safe compare); CORS is an allow-list; the server refuses to start with a live key. Covered by 22 tests (19 before #73).

"App calls it = **no**" marks dead endpoints (decision N1).

| Method | Path | Operation | Token | App calls it | Audit |
|---|---|---|---|---|---|
| POST | `/auth/otp/request` | requestOtp | none | yes |  |
| POST | `/auth/otp/verify` | verifyOtp | none | yes |  |
| POST | `/auth/refresh` | refreshTokens | none | yes | #76 now called on 401 |
| POST | `/auth/logout` | logout | owner | yes | #76 now called on sign out |
| GET | `/me` | getMe | owner | **no** |  |
| POST | `/guest-sessions` | createGuestSession | none | yes |  |
| GET | `/venues/{venueSlug}` | getVenue | none | yes |  |
| GET | `/venues/{venueSlug}/menu` | getMenu | none | yes |  |
| GET | `/venues/{venueSlug}/wifi` | getWifi | guest | yes |  |
| GET | `/venues/{venueSlug}/offers` | listOffers | none | yes |  |
| POST | `/orders` | createOrder | guest | yes | #78 empty order refused |
| GET | `/orders/{orderId}` | getOrder | guest | yes |  |
| POST | `/orders/{orderId}/bill` | quoteBill | guest | yes | #72 total minus paid, delivery fee |
| POST | `/payments` | initializePayment | guest | yes | #73 (server) one charge per key; #74 keeps quoteId |
| GET | `/payments/{reference}` | getPayment | guest | yes | #73 late success counts; #74 marks its own dishes |
| POST | `/payments/{reference}/verify` | verifyPayment | guest | yes | #73 late success counts; #74 marks its own dishes |
| POST | `/webhooks/paystack` | paystackWebhook | none | **no** | #73 late success counts |
| POST | `/waiter-calls` | callWaiter | guest | yes |  |
| GET | `/waiter-calls/{waiterCallId}` | getWaiterCall | guest | yes |  |
| GET | `/venues/{venueSlug}/loyalty` | getVenueLoyaltyProgram | none | yes |  |
| GET | `/venues/{venueSlug}/loyalty/me` | getMyLoyaltyCard | loyalty | yes |  |
| PUT | `/venues/{venueSlug}/loyalty/me` | joinLoyalty | loyalty | yes |  |
| DELETE | `/venues/{venueSlug}/loyalty/me` | leaveLoyalty | loyalty | yes |  |
| POST | `/venues/{venueSlug}/loyalty/me/redeem` | redeemReward | loyalty | yes |  |
| POST | `/reviews` | createReview | guest | yes |  |
| GET | `/venues/{venueSlug}/game/leaderboard` | getLeaderboard | none | **no** |  |
| POST | `/venues/{venueSlug}/game/scores` | submitScore | guest | yes |  |
| POST | `/feedback` | sendFeedback | guest | yes |  |
| GET | `/owner/venues/{venueId}` | ownerGetVenue | owner | yes |  |
| PATCH | `/owner/venues/{venueId}` | ownerUpdateVenue | owner | yes |  |
| PUT | `/owner/venues/{venueId}/theme` | ownerSetTheme | owner | yes |  |
| POST | `/owner/venues/{venueId}/media` | ownerCreateMediaUpload | owner | yes |  |
| GET | `/owner/venues/{venueId}/services` | ownerGetServices | owner | yes |  |
| PUT | `/owner/venues/{venueId}/services` | ownerSetServices | owner | yes |  |
| GET | `/owner/venues/{venueId}/staff` | ownerListStaff | owner | yes |  |
| POST | `/owner/venues/{venueId}/staff` | ownerInviteStaff | owner | yes |  |
| GET | `/owner/venues/{venueId}/menu/categories` | ownerListCategories | owner | **no** |  |
| POST | `/owner/venues/{venueId}/menu/categories` | ownerCreateCategory | owner | yes |  |
| PATCH | `/owner/venues/{venueId}/menu/categories/{categoryId}` | ownerUpdateCategory | owner | yes |  |
| DELETE | `/owner/venues/{venueId}/menu/categories/{categoryId}` | ownerDeleteCategory | owner | yes |  |
| POST | `/owner/venues/{venueId}/menu/items` | ownerCreateItem | owner | yes |  |
| PATCH | `/owner/venues/{venueId}/menu/items/{menuItemId}` | ownerUpdateItem | owner | yes |  |
| DELETE | `/owner/venues/{venueId}/menu/items/{menuItemId}` | ownerDeleteItem | owner | yes |  |
| GET | `/owner/venues/{venueId}/tables` | ownerListTables | owner | yes |  |
| POST | `/owner/venues/{venueId}/tables` | ownerCreateTables | owner | yes |  |
| GET | `/owner/venues/{venueId}/tables/{tableId}/qr` | ownerGetTableQr | owner | **no** |  |
| GET | `/owner/venues/{venueId}/orders` | ownerListOrders | owner | yes |  |
| POST | `/owner/venues/{venueId}/orders` | ownerCreateOrder | owner | yes | #78 empty order refused |
| PUT | `/owner/orders/{orderId}/status` | ownerSetOrderStatus | owner | yes |  |
| POST | `/owner/orders/{orderId}/cash-payment` | ownerRecordCashPayment | owner | **no** |  |
| GET | `/owner/venues/{venueId}/payment-settings` | ownerGetPaymentSettings | owner | yes |  |
| PUT | `/owner/venues/{venueId}/payment-settings/manual` | ownerSetManualPayments | owner | yes |  |
| PUT | `/owner/venues/{venueId}/payment-settings/paystack` | ownerConnectPaystack | owner | yes |  |
| DELETE | `/owner/venues/{venueId}/payment-settings/paystack` | ownerDisconnectPaystack | owner | yes |  |
| POST | `/owner/venues/{venueId}/payment-settings/paystack/test` | ownerTestPaystack | owner | yes |  |
| POST | `/owner/orders/{orderId}/manual-payment` | ownerRecordManualPayment | owner | yes |  |
| GET | `/owner/venues/{venueId}/waiter-calls` | ownerListWaiterCalls | owner | yes |  |
| PATCH | `/owner/waiter-calls/{waiterCallId}` | ownerUpdateWaiterCall | owner | yes |  |
| GET | `/owner/venues/{venueId}/loyalty` | ownerGetLoyalty | owner | yes |  |
| PUT | `/owner/venues/{venueId}/loyalty` | ownerSetLoyalty | owner | yes |  |
| GET | `/owner/venues/{venueId}/loyalty/members` | ownerListLoyaltyMembers | owner | **no** |  |
| POST | `/owner/venues/{venueId}/loyalty/confirm` | ownerConfirmRedemption | owner | **no** |  |
| GET | `/owner/venues/{venueId}/payout-account` | ownerGetPayoutAccount | owner | **no** |  |
| PUT | `/owner/venues/{venueId}/payout-account` | ownerSetPayoutAccount | owner | **no** |  |
| GET | `/owner/venues/{venueId}/dashboard` | ownerGetDashboard | owner | yes |  |
| GET | `/owner/venues/{venueId}/floor` | ownerGetFloor | owner | yes |  |
| GET | `/owner/venues/{venueId}/transactions` | ownerListTransactions | owner | **no** |  |
| POST | `/owner/transactions/{transactionId}/refund` | ownerRefundTransaction | owner | **no** |  |
| GET | `/owner/venues/{venueId}/written-reviews` | ownerListWrittenReviews | owner | yes |  |
| POST | `/owner/written-reviews/{writtenReviewId}/reply` | ownerReplyToReview | owner | yes |  |
| GET | `/owner/venues/{venueId}/insights` | ownerGetInsights | owner | yes |  |
| GET | `/owner/venues/{venueId}/sales` | ownerGetSales | owner | yes |  |
| GET | `/owner/venues/{venueId}/feedback` | ownerListFeedback | owner | yes |  |
| PATCH | `/owner/venues/{venueId}/feedback/{feedbackId}/archive` | ownerArchiveFeedback | owner | yes |  |
| POST | `/owner/venues/{venueId}/feedback/ask` | ownerAskFeedbackAi | owner | yes |  |
| GET | `/owner/venues/{venueId}/links` | ownerListCustomLinks | owner | yes |  |
| POST | `/owner/venues/{venueId}/links` | ownerCreateCustomLink | owner | yes |  |
| PATCH | `/owner/venues/{venueId}/links/{linkId}` | ownerUpdateCustomLink | owner | yes |  |
| DELETE | `/owner/venues/{venueId}/links/{linkId}` | ownerDeleteCustomLink | owner | yes |  |
| GET | `/owner/venues/{venueId}/loyalty/analytics` | ownerGetLoyaltyAnalytics | owner | yes |  |
| GET | `/owner/venues/{venueId}/loyalty/customers` | ownerListLoyaltyCustomers | owner | yes |  |
| POST | `/owner/venues/{venueId}/loyalty/scan` | ownerScanLoyaltyCard | owner | yes |  |
| GET | `/owner/business` | ownerGetBusiness | owner | yes |  |
| PATCH | `/owner/business` | ownerUpdateBusiness | owner | yes |  |
| POST | `/owner/business/locations` | ownerCreateLocation | owner | yes |  |
| PATCH | `/owner/business/locations/{locationId}` | ownerUpdateLocation | owner | yes |  |
| GET | `/owner/venues/{venueId}/devices` | ownerListScannerDevices | owner | yes |  |
| POST | `/owner/venues/{venueId}/devices/pair` | ownerPairScannerDevice | owner | yes |  |
| DELETE | `/owner/venues/{venueId}/devices/{deviceId}` | ownerRevokeScannerDevice | owner | yes |  |
| DELETE | `/owner/venues/{venueId}/staff/{staffId}` | ownerRevokeStaff | owner | yes |  |
| DELETE | `/auth/account` | deleteAccount | owner | yes |  |

## 3. Files deleted or moved, dependencies

| What | Change | PR |
|---|---|---|
| `src/features/owner/kit/RowSkeletons.tsx` | Deleted, no importer | #81 |
| `linkIcon()` in `owner/screens/links/icons.ts` | Deleted, no caller | #81 |
| `src/ui/index.ts` | Deleted, a barrel nothing imports | #81 |
| `assets/images/cravins-mark-48.png` | Deleted, only the 96 px mark is used | #81 |
| `STAFF`, sample loyalty phones, sample board, code `123456` | Moved to `src/mocks/demo.ts` | #83 |
| `public/` (new) | `index.html`, `manifest.json`, `icons/` (copies of `design/logo/png`) | #79 |

**Screenshots and design images:** none removed. `design/renders/` is the spec AGENTS.md rule 3 checks screens against, and `design/` isn't shipped. Generated output (`dist/`, `shots/`, `test-results/`, `playwright-report/`) was already in `.gitignore` and isn't tracked.

**Dependencies:** none removed. The ones no file imports (`expo-linking`, `expo-symbols`, `expo-system-ui`, `react-dom`, `react-native-screens`, `react-native-web`, `react-native-worklets`, `babel-preset-expo`) are needed by Expo Router, the web build, Reanimated and Babel.

## 4. Hard-coded values extracted

| Values | Now in | PR |
|---|---|---|
| Polling 3 s, 5 s, 10 s, 15 s in 12 files | `POLL_MS` in `src/lib/polling.ts` | #80 |
| Sample staff, sample code, sample table, loyalty members, game board | `src/mocks/demo.ts` | #83 |
| Sample sign-in labels (English in code, two wrong) | Built from the staff list + `owner.sampleLogin`, `owner.roles.*` | #83 |
| `#FC5205`, `#FFFFFF` in `app.config.ts` | `design/tokens.json` | #79 |

Already done on 3 Nov: colours to the palette, copy to `en.json`, the site URL to env, query keys to one factory. What's left: spacing numbers that aren't on the token scale stay so the renders still match (D4), and colours in contrast maths, printed QR cards and dev pages are data, not style.

## 5. Folder structure

Unchanged on purpose: `src/app` (routes only), `src/features/<name>` (feature-owned screens, hooks, logic), `src/ui`, `src/theme`, `src/lib`, `src/mocks`, `src/i18n`. It matches BUILD.md section 6, and lint enforces importing features through their index. Moving to `components/`, `services/` and similar would touch nearly every file for no change in behaviour, and conflict with the owner branches in flight. See `docs/ARCHITECTURE.md`.

New files: `src/lib/polling.ts`, `src/lib/demo.ts`, `src/mocks/demo.ts`, `src/lib/api/ownerRetry.ts`, `src/features/session/ownerRefresh.ts`, `public/`.

## 6. Checks before and after

| Check | `main` at the start (`aa9bebb`) | After the audit PRs |
|---|---|---|
| `npx tsc --noEmit` | 0 errors | 0 errors on every branch |
| `npx expo lint` | 0 errors, 0 warnings | 0 on every touched file |
| `npm test` (jest) | 455 passed, 88 suites | +18 new tests (#72: 5, #74: 2, #76: 9, #78: 1, #83: 1), all passing |
| `server`: `npm test` | 19 passed | 22 passed (#73) |
| Playwright (web build, 390×844) | 33 passed | +1 (`e2e/pwa.spec.ts`, #79) |

CI: #72–#76 are fully green. #78 and #79 fail one Floor test that **also fails on `main`** since #77 (the new Floor) merged; PR #82 fixes that test. Locally, a full Playwright run was stopped once for low memory, so the owner e2e for #76 relies on CI.

Screenshots: CI uploads every Playwright screenshot as the `playwright-report` artifact on each PR; none are committed.

## 7. Secrets

**None found.** Every key-like string in git history is a placeholder in tests or examples (`sk_test_abcdef1234567890`, `sk_test_SECRETabcd9876`, `sk_test_xxxx…`, `pk_test_beanthere0sample`). Nothing to rotate. `.env` and `server/.env` are ignored; `.env.example` and `server/.env.example` list every setting. The Paystack secret is only read by `server/`, never logged, and errors name the setting, not its value.

## 8. Needs Clarke's decision

| # | Question | Why I didn't change it | My suggestion |
|---|---|---|---|
| N1 | 12 endpoints have no caller: `getMe`, `getLeaderboard`, `ownerListCategories`, `ownerGetTableQr`, `ownerRecordCashPayment` (replaced by manual payment), `ownerListLoyaltyMembers`, `ownerConfirmRedemption`, `ownerGetPayoutAccount`, `ownerSetPayoutAccount` (Cravins no longer holds funds), `ownerListTransactions`, `ownerRefundTransaction`, and `paystackWebhook` in the app's client (Paystack calls the server, never the app). | Removing them changes the contract. | Drop the payout and cash-payment ones before Phase 5; keep `getMe`; decide whether refunds and the live leaderboard are wanted. |
| N2 | The game board uses this phone's scores (plus samples in demo), not `GET …/leaderboard`. | Wiring the real board is a UI change with no render. | Use the API board once there's a server. |
| N3 | The live Vercel site runs on the mock (sample venues) by design until Phase 5. | Changing it means a real backend. | Keep, but don't share it as "the product" with real venues. |
| N4 | GitHub repo is still `clarke-ro/ozaa`. | Renaming changes a public URL (GitHub redirects the old one). | Rename to `cravins` when convenient. |
| N5 | Files over 300 lines: `mocks/mockClient.ts` (1,682), `lib/api/http.ts` (670), `mocks/world.ts` (664), `owner/screens/productShells.tsx` (488), `loyalty/factsWire.ts` (437), `menu/ItemScreen.tsx` (423), `LoyaltyCustomersScreen.tsx` (382), `OwnerLogin.tsx` (371), `orders/OrderScreen.tsx` (302). | Splitting them now would conflict with every open PR and the owner branches in flight, and screens need render checks. | Split `mockClient.ts` by area (orders, payments, owner menu, loyalty) once the open PRs merge; do screens one PR each with screenshots. |
| N6 | Most mock owner calls (47 of 62) don't check who is signed in or that the venue is theirs. | The mock runs in the browser, so it isn't a security line. | Phase 5 contract tests must check a staff member at venue A gets 403 for venue B on every owner call. |
| N7 | No meta description on the web page. | It's new public copy. | Give me the line. |

## 9. Remaining issues by rank

1. **High, before Phase 5 goes live:** the real server needs everything the mock skips: tenant checks on every owner call (N6), rate limits on OTP and order creation, server-side bill quotes (the 2b sandbox trusts the app's quote header, acceptable only because it refuses live keys), a store for idempotency keys and payments (the sandbox keeps them in memory).
2. **Medium:** `GET /payments/{reference}` on the sandbox has no auth; the reference is a random UUID, so it can't be guessed, but Phase 5 should tie it to the guest token.
3. **Medium:** the large files in N5.
4. **Low:** each tap on Pay makes a new quote and a new idempotency key, so a retry after a network drop starts a second payment rather than resuming the first. The guest approves only one MoMo prompt, so no double charge, but Phase 5 could reuse the quote.
5. **Low:** the table card print window puts the owner's accent colour into a `style` attribute without escaping (names and text are escaped). The colour is the owner's own and checked as hex by the contract.
6. **Low:** the loyalty sample hint always shows Mama's Kitchen's sample number, even at the other two venues (demo builds only).
7. **Low:** `expo-env.d.ts` is tracked and also in `.gitignore`; on Windows it shows as modified because of line endings. Harmless; CI needs it for `tsc`.

**Merge order:** any order works. Each PR merges cleanly into `main` on its own and with the others.
