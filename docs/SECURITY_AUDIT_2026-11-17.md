# Security and hardening audit, 2026-11-17

What's in scope: the code that exists today. That's the Expo app (guest and owner), the Hono server, the Postgres schema on Supabase, Supabase Storage, the Astro landing page, Vercel and Heroku config, and the GitHub workflows.

Left out because it doesn't exist yet: subscription plans (Free, Pro, Pro+), RevenueCat, billing, trials and quotas.

In this codebase, "money" means guest payments through each venue's own Paystack account. Cravins never holds funds.

## Overall health

The codebase is in good shape.
- Every owner route checks the caller's role at the venue that owns the data.
- Guest tokens are signed and expire.
- Paystack webhooks are checked against the right venue's key, and the amount must match what the server stored.
- Logs carry no phones, emails or tokens.
- Every table has row-level security on, with no policies, so Supabase's public API can read nothing.

This audit found **1 high (P1)** issue, several medium (P2) gaps and a set of small (P3) hardening items. All are fixed in this change, each with a test.

**Production readiness: CONDITIONAL.** Fine for the current sandbox stage (Paystack test keys, sample venues). It needs the manual actions below before real money and real venues.

## Findings and fixes

| # | Sev | Finding | Files | Fix | Evidence |
|---|---|---|---|---|---|
| 1 | P1 | **Invite takeover across venues.** Take someone who exists but has no email saved and no sign-in yet (for example, invited to venue B by phone only). The owner of venue A could invite their number with an email A controls. The invite saved that email and made a Clerk sign-in for it, so A could sign in as that person and get their venue B access. | `server/src/routes/ownerStaff.ts` | The invite only adds an email for a person who has no sign-in yet **and** works only at venues the inviting owner owns. Otherwise it returns `409 email_not_yours`, which is now documented in `api/openapi.yaml`. | `ownerStaff.test.ts`: "another venue's owner can't put their email…". The test failed before the fix (201) and passes after (409). |
| 2 | P2 | A late "failed" or "abandoned" payment update could overwrite "succeeded" (a webhook and a verify racing). The money was already counted; only the status went wrong. | `server/src/db/paymentStore.ts` | Non-success updates never touch a succeeded row. | `paymentStore.test.ts`: "a late failed answer…". It failed before and passes after. |
| 3 | P2 | No rate limits on guest actions (starting a visit, ordering, paying, feedback, game scores). One script could flood a kitchen with orders. | `server/src/app.ts`, `server/src/routes/guest.ts`, new `server/src/http/rateLimit.ts` | Per-address limits: 120 guest writes a minute, and 30 new visits a minute. Per visit: 20 orders every 10 minutes. Staff routes, the webhook and phone codes are left out (they have their own checks). | `hardening.test.ts` (2 tests), `rateLimit.test.ts` (3 tests) |
| 4 | P2 | The server sent no security headers, had no body-size cap, and answered plain HTTP. | `server/src/app.ts` | Added `secureHeaders`, a 256 KB body cap (`413 too_large`), and refusal when `x-forwarded-proto` is `http`. | `hardening.test.ts` (3 tests) |
| 5 | P2 | `drizzle-orm` 0.44.7 had a **high** advisory (SQL identifiers not escaped). It isn't reachable here: there's no `sql.identifier` or `sql.raw` in the code. | `server/package.json` | Upgraded to 0.45.4. | Server `npm audit`: high 1 → 0. All 117 server tests pass. |
| 6 | P3 | The review-reply route looked the review up before checking sign-in, so anyone could probe which review ids exist (404 vs 401). | `server/src/routes/ownerFeedback.ts` | It checks sign-in first. | Covered by the existing feedback tests |
| 7 | P3 | The Google review link accepted any URL scheme (`javascript:`, `data:`), and it's meant to be shown to guests. | `server/src/routes/ownerVenue.ts` | It must be `https`. | `ownerVenue.test.ts`: "the Google review link must be https…" |
| 8 | P3 | The phone-code limiter's map of addresses never shrank. | `server/src/routes/otp.ts` | Addresses with nothing in the last hour are swept out. | `otp.test.ts` passes |
| 9 | P3 | Neither Vercel site sent security headers, and the owner app could be framed (clickjacking). | `vercel.json`, `landing/vercel.json` | Added nosniff, a referrer policy, HSTS and a permissions policy. `/owner` and the landing page can't be framed. Guest menu pages still can, for the website embed. | Config review; to check on the next deploy (see the manual actions) |
| 10 | P3 | The GitHub workflows ran with the repo's default token permissions. | `.github/workflows/*.yml` | `permissions: contents: read` | Config review |
| 11 | P3 | Astro 7.4.4 had a moderate advisory. | `landing/package.json` | Upgraded to 7.4.12. | Landing `npm audit`: 0. The build passes (15 pages). |

## Checked and found sound (no change needed)

- **Owner and staff sign-in.**
  - Clerk tokens are checked for signature, expiry and `azp` (only tokens made for our own sites).
  - Only a Clerk-verified email or phone links to a staff record, and a record that's already linked can't be claimed again.
  - Removed members are refused, and removing someone also revokes their Clerk sessions.
- **Access to other venues' data.**
  - I read every `/owner` route.
  - Routes with a venue *and* an item id limit the item lookup to that venue: menu, links, promos, staff, tables, devices, feedback and loyalty customers.
  - Routes with only an item id find the item's venue, then check the caller's role there: order status, mark paid, waiter calls, review reply and locations.
  - Owners can't hand out the owner role.
- **Guests.**
  - Tokens are HMAC-signed with a constant-time compare, last 4 hours and carry no personal data.
  - A guest can only read orders, waiter calls and payments for their own table and visit.
  - Prices, the bill quote and the amount charged all come from the server.
- **Payments.**
  - Webhook signatures are checked with the venue's own key, unknown references are ignored, and the amount must match.
  - Finished payments never change.
  - Money is added to an order only once, even under a race (an existing test covers this).
  - `Idempotency-Key` is required.
- **Database.**
  - Every query goes through Drizzle with bound parameters.
  - RLS is on for all 28 tables with no policies, which is intended: the Supabase advisor shows this only as INFO.
- **Storage.** The `media` bucket enforces a 5 MB limit and JPEG/PNG/WebP only, so a raw upload can't get around the server's checks. Each file path is random and inside the venue's own folder.
- **Frontend XSS.** Both print pages (table cards and order tickets) escape every name and note, with tests. There's no `dangerouslySetInnerHTML`. Socials shown to guests are reduced to `http(s)`, and custom links accept only web, email or phone links.
- **Secrets.**
  - I searched the working tree and the full git history for Paystack, Clerk, Supabase, AWS, GitHub and Heroku keys, private keys and database URLs. I found only made-up test values and placeholders.
  - `.env.production` holds build flags only.
  - Config refuses weak secrets: `ENCRYPTION_KEY` must be 64 hex characters, `GUEST_TOKEN_SECRET` at least 32 characters, and the Paystack key a test key.
- **Errors and logs.** The server's 500s give no details, the health check never echoes database errors, and logs carry no personal data.

## Validation (run on this branch)

| Check | Result |
|---|---|
| App `npx tsc --noEmit` | pass |
| App `npx expo lint` | 0 problems |
| App jest | 742 / 742 |
| Server `npm run typecheck` | pass |
| Server tests | 117 / 117 (was 106; 11 new) |
| Playwright (mock web build) | 68 / 68 |
| `npx expo export -p web` | pass |
| Landing `npm run build` | pass |
| Contract lint (redocly) and fixtures check | pass |
| Generated files in sync (CI's diff check) | pass |
| `npm audit` app / server / landing | 0 high or critical. 20 moderate in the app (all build/test tooling: jest, glob, minimatch, Expo CLI), 4 moderate in the server (`drizzle-kit`, dev only). The suggested "fixes" for those are downgrades (Expo 52, drizzle-kit 0.18), so they were left. |

## Unresolved risks

- **No Content-Security-Policy on the web app.** The app loads scripts from Clerk and Paystack, so a strict policy has to be built and tested against the live site. For now framing is blocked on `/owner`.
- **Rate limits live in memory on one dyno.** They reset when it restarts and won't be shared if Heroku runs more than one dyno. Move them to the database or Redis before scaling out.
- **Game scores come from the guest's phone**, so a determined person can fake a high score. The server already rejects impossible speeds, and only a weekly leaderboard is at stake. Accepted for now.
- **Public bucket.** Menu photos are meant to be public, but staff profile photos are public too, behind unguessable URLs.
- **Deploys don't wait for CI.** The server deploys on every push to `main` that touches `server/`, and Vercel deploys `main`, whether CI passed or not. #192 reached main with failing CI today.
- **`Idempotency-Key` for payments is unique across all payments, not per guest.** Keys are random UUIDs made by the app, so another guest can't guess one.

## Manual actions for Clarke

1. **Turn on branch protection for `main`.** On GitHub: Settings → Branches → add a rule for `main` → "Require status checks to pass before merging" → choose **check** and **PR target**. This stops a red PR from merging and deploying.
2. **After the next Vercel deploy**, open the app and the landing page and check that everything works. The new headers only apply once deployed: sign-in, payments (Paystack opens), the camera scanner, and the website embed on another site.
3. **Before going live:**
   - Paystack live keys stay on the server only. The live switch is off in code and needs your go-ahead.
   - Check Supabase backups and point-in-time recovery on the paid plan.
   - Switch Clerk to a production instance.
4. **Heroku:** the app runs one Basic dyno. Keep it at one until the rate limits move off memory (see above).

## Content-Security-Policy (added 2026-11-22, report-only)

The web app (`vercel.json`) sends `Content-Security-Policy-Report-Only`. The browser reports anything the policy *would* block to Sentry (project `cravins-web`, its security endpoint), but blocks nothing yet.

| Directive | Allows | Why |
|---|---|---|
| `default-src 'self'` | our own site | Everything not listed below |
| `script-src` | self, `*.clerk.accounts.dev`, `challenges.cloudflare.com` | Our bundles. Clerk loads its sign-in script from its own address and may show Cloudflare's bot check. There are no inline scripts in the build. |
| `style-src` | self, `'unsafe-inline'` | React Native Web writes its styles inline |
| `img-src` | self, `data:`, `blob:`, any `https:` | Venue photos (Supabase), Clerk avatars, map tiles, photo previews before upload |
| `media-src` | self, `blob:`, `*.supabase.co` | Sample review video, uploaded media |
| `connect-src` | self, `*.herokuapp.com`, `*.supabase.co`, `*.clerk.accounts.dev`, `clerk-telemetry.com`, `*.ingest.de.sentry.io` | The API, photo uploads, Clerk sign-in, error reports |
| `frame-src` | `challenges.cloudflare.com` | Clerk's bot check |
| `worker-src` | self, `blob:` | |
| `object-src 'none'`, `base-uri 'self'`, `form-action 'self'` | | Common attack routes, closed |

Paystack is a full-page redirect to its checkout, so it needs no entry.

**How it was checked:** the demo build was served with this policy *enforced*. All 71 Playwright tests passed, and a crawl of 22 guest and owner pages logged no violation events. The real build's third-party hosts can't be reached from the test environment, so it ships report-only first.

**To enforce it:**
1. Watch Sentry `cravins-web` for "CSP" events for about a week of normal use: sign-ins, payments, photo uploads, the scanner.
2. Add any legitimate host that shows up.
3. Rename the header in `vercel.json` from `Content-Security-Policy-Report-Only` to `Content-Security-Policy`.

**When Clerk moves to production** (a custom domain such as `clerk.<your-domain>`), add that address to `script-src` and `connect-src`.
