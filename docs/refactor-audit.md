# Refactor and hygiene audit

Date: 3 Nov 2026 · Branch: `refactor/hygiene-pass` (from `chore/payments-off`, `PAYMENTS_ENABLED=false`) · Mock API.

Rank: **Critical** breaks the build or loses data · **High** a real bug, a privacy gap or a spec breach · **Medium** wrong in some cases, or a debt that will bite · **Low** tidy-up.

## 1. Baseline (before)

| Check                                                           | Result                                                                           |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `npx tsc --noEmit`                                              | Pass, 0 errors                                                                   |
| `npx expo lint`                                                 | 0 errors, 1 warning (`import/no-named-as-default-member` in `src/i18n/index.ts`) |
| `npx jest`                                                      | Pass, 221 tests in 44 suites                                                     |
| `any` / `@ts-ignore` / `eslint-disable` / `console.*` in `src/` | None                                                                             |
| Raw `fetch` outside the API layer                               | One, `owner/data/uploadImage.ts` (the signed upload PUT; that is correct)        |
| Web bundle                                                      | See section 10                                                                   |

The codebase is already in decent shape. The earlier owner audit (`docs/owner-audit.md`) cleared 64 lint errors and the nested-button runtime error. Nothing below is critical.

## 2. Folder structure

What exists today matches BUILD.md section 6 and AGENTS.md rule 7 (routes in `src/app/`, grouped by feature):

```
src/
  app/            routes only: [venue]/… (guest), owner/… (owner + login), dev/…, index, +not-found
  features/       cart, game, loyalty, menu, notices, orders, owner, pages, pay, reviews,
                  session, tables, theming, venue, waiter, wifi
  features/owner/ chrome/ (nav shell), data/ (keys, hooks), desk/ (pure logic), floor/,
                  kit/ (owner UI kit + charts), screens/<screen>/
  ui/             guest + shared components, theme provider, makeStyles
  theme/          tokens (generated), palette (light/dark), fonts
  lib/            api client (mock + http), env, money, phone, time, haptics, flags
  mocks/          mock client, fixtures, sample world
  i18n/           i18next + locales
```

Misplaced or inconsistent:

- **Two component kits.** `src/ui/` (guest and shared) and `src/features/owner/kit/` (owner). Some owner kit parts are generic (`ConfirmDialog`, `ModalSheet`, `Toast`, `Toggle`, `Segmented`, `Field`). See "Needs decision" D1.
- **Owner screens are split between `screens/<name>/` folders and loose files** (`FloorScreen.tsx`, `MoreScreen.tsx`, `ScanStampScreen.tsx`, `SocialsScreen.tsx`, `LoyaltyCustomersScreen.tsx`, `AskCravinsAiScreen.tsx`, `ShellScreen.tsx`, `productShells.tsx`). Medium.
- `owner/OwnerLogin.tsx` and `owner/OwnerLoyalty.tsx` sit at the feature root, not under `screens/`. Low.
- **Barrel renames** hide the real name: `ServicesScreen as ServicesDeskScreen`, `ReviewsScreen as ReviewsDeskScreen`, `LinksScreen as CustomLinksScreen`, `FilterChips as ChipRow`. Searching for a screen's name misses its route. Low.
- Route groups `(guest)/(owner)/(auth)` don't exist. URLs wouldn't change, but it touches every route. See D2.

## 3. Routes and navigation

- 19 guest routes, 30 owner routes, 2 dev routes, landing, `+not-found`.
- Every `router.push/replace` and `href` target resolves to a route file (checked by script). Every `ServiceId` in the contract has a route. No 404s found.
- `serviceHref()` in `venue/HomeScreen.tsx` is a ternary chain where every branch returns its input. Low.
- **`/owner/login` still shows the sign-in form to a signed-in owner** instead of sending them to the desk. Low.
- **`[venue]/t/[table].tsx` is not thin:** it calls the API, saves the session and imports from `@/mocks`. Its error button says "Try again" but goes to `/` instead of retrying. Medium.
- Back on detail pages falls back to `/owner/more` when there is no history (good).
- `/dev/ui` and `/dev/mock-checkout` ship in production builds. `mock-checkout` redirects while payments are off. See D6.

## 4. Bugs and runtime risks

| #   | Rank   | Where                                           | Bug                                                                                                                                                                                                                                                             |
| --- | ------ | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | High   | `app/_layout.tsx`                               | **No error boundary.** BUILD.md section 6 lists it for the root layout. A render error anywhere blanks the app with no way back.                                                                                                                                |
| B2  | High   | `settings/SettingsScreen.tsx` sign-out          | **Sign-out clears the session but not the query cache.** The next person to sign in on that device (say a waiter on the owner's tablet) briefly sees the previous account's orders, customers and payouts, and the persisted copy stays in storage.             |
| B3  | High   | `app/_layout.tsx` persister                     | **Every query is persisted to storage** (localStorage on web) for an hour, including owner loyalty customers (names, masked phones, emails, search text). BUILD.md section 11 says to persist the venue, menu and stories only.                                 |
| B4  | High   | `game/GameScreen.tsx`                           | **The score is sent from inside a `setState` updater.** React may run updaters twice (it always does in dev Strict Mode), so a score can be sent twice. `durationMs` is always the made-up `15000`, not the real run length. A failed send is silently dropped. |
| B5  | High   | `LoyaltyCustomersScreen.tsx`                    | **Manual stamp and redeem send `phoneMasked` ("024 *** 567") as `qrPayload`.** Works only because the mock ignores the payload. A real server can't match it. The redeem button also uses a hard-coded `10` stamps. See D3.                                     |
| B6  | Medium | `session/myCalls.ts`                            | The guest's waiter calls are never cleared. After scanning a different table or venue, Call waiter and the bell keep showing (and polling) the old visit's calls.                                                                                               |
| B7  | Medium | `orders/OrderSheet.tsx`, `menu/MenuCartBar.tsx` | The cart is scoped to a venue only when adding. Open venue B with venue A's cart and the order sheet shows A's dishes and would send them to B.                                                                                                                 |
| B8  | Medium | `dashboard/SalesSummary.tsx`                    | While the week/month figure loads, or if it fails, sales show as GH₵0.00, not a loading or error state.                                                                                                                                                         |
| B9  | Medium | `LoyaltyCustomersScreen.tsx`                    | Search sends a request on every keystroke. Each partial term becomes its own cache entry (and was persisted, see B3).                                                                                                                                           |
| B10 | Low    | `owner/_layout.tsx`                             | See section 3: signed-in owner on `/owner/login`.                                                                                                                                                                                                               |

## 5. Duplication

- **Query keys.** Owner keys live in `owner/data/keys.ts`, but six screens still type them as strings (`FloorScreen`, `ScanStampScreen`, `LoyaltyCustomersScreen`, `LinkEditor`, `InviteSheet`, `PairSheet`), and `'owner-loyalty-customers'`, `'owner-staff'`, `'owner-devices'` and others have no factory entry. Guest keys (`['venue', slug]`, `['menu', slug]`, `['loyalty', …]`, `['order', id]`) are all literals. One typo silently breaks a refresh. Medium.
- **Empty and loading states:** `ui/states.tsx` `EmptyState` and `Skeleton` are unused. The owner app uses `kit/EmptyCard` and `chrome/OwnerPage` `SkeletonBlock`/`DeskWait`. Low.
- **Sheet scrims:** `menu/DietFilterSheet.tsx` and `venue/LanguagePicker.tsx` hard-code `rgba(0,0,0,0.35)` when `theme.scrim` exists. Low.
- **Swatch lists:** `branding/LookSection.tsx` and `tables/TableCardPreview.tsx` each define their own named colour swatches (Orange, Black, Green, Blue…). Low.

## 6. Dead code

Unused anywhere, including tests:

- `lib/haptics.ts` `hapticImpact`
- `lib/money.ts` `addPesewas`, `parsePesewas`
- `mocks/resolveMedia.ts` `isSampleMedia`
- `mocks/world.ts` `slugForVenueId`
- `ui/Screen.tsx` `screenPad`
- `ui/states.tsx` `EmptyState`, `Skeleton`
- `owner/kit/charts/Sparkline.tsx` (whole file)
- `owner/kit/Grain.tsx` (whole file)

No unused files beyond those two. The dependencies `src/` never imports (`expo-linking`, `expo-symbols`, `expo-system-ui`, `react-dom`, `react-native-screens`, `react-native-web`, `react-native-worklets`) are all needed by expo-router, the web build or Reanimated, so none can go.

## 7. Hard-coded values

- **Colours:** `#fff` and `#52525B` on the landing page, `+not-found` and dev routes. `#E4E4E7` and `rgba(255,255,255,0.92)` in `GameScreen`. `#000` `shadowColor` in 6 files. `#FFFFFF` QR pad in `WalletCard`. `IconButton` light tint. Scrims (section 5). The Branding and table-card swatch hexes are data (palette choices), so they can stay as named constants. The `tablePdf` and `WalletCard` SVG/HTML strings are print output, so they stay too.
- **Sizes:** 317 raw numbers in style props (`fontSize`, `padding`, `gap`, `borderRadius`…). Most sit on the token scale (16, 12, 20, 24, 999). Some don't (14, 11, 6, 10). Swapping the on-scale ones changes nothing. Swapping the off-scale ones moves pixels against the approved renders. See D4.
- **Copy not in i18n:** `AskCravinsAiScreen` (placeholder, button), `LoyaltyCustomersScreen` (5 labels incl. "Export CSV", "Redeem Reward Free Dish"), `productShells.tsx` and `ShellScreen.tsx` (demo text, "SPECIFICATION ROADMAP"), `kit/ConfirmDialog` ("Dismiss dialog"), `kit/ModalSheet` ("Close", "Close overlay"), `OwnerLogin` ("Change phone"), `GameScreen` ("Align"). Medium.
- **URLs:** `https://cravins.app` fallback in `venue/HomeScreen.tsx`. Low.
- **Magic numbers:** game `minScore ?? 15` and `durationMs: 15000`; `stamps < 10` (B5); toast offset `insets.top + 60`. Low.
- **Money:** `productShells.tsx` POS demo prices in cedis as floats (`price: 65`), against the pesewas rule. See D5.

## 8. Missing states

- Guest screens use a full-screen spinner (`LoadingState`), not skeletons. The owner app already uses skeletons. Medium; changing it is visual, see D4.
- `SalesSummary` has no loading or error state (B8).
- `GameScreen` has no error message when a score fails to send (B4).
- Error, empty and loading are otherwise covered: owner pages go through `DeskWait`, guest pages through `LoadingState`/`ErrorState`.

## 9. Performance

- **Game loop** calls `setState` every animation frame, re-rendering the whole game screen 60 times a second. Fine on desktop web, heavy on low-end Android. Reanimated is installed. Medium, see D7.
- **Long owner lists** (orders, feedback, reviews, loyalty customers, transactions) render with `.map` inside the page `ScrollView`. Fine for the sample data. With real volumes they need `FlashList` and server pagination. The guest menu already uses `FlashList`. Medium, waits on the backend.
- `FeedbackCard` and `TableCardPreview` use React Native `Image`, not `expo-image` (no caching or placeholder). Low.
- The mock client and fixtures are always in the bundle, even in `http` mode, because `lib/api/index.ts` imports them statically. That's expected until the backend exists. Low, D8.
- No measured re-render hot spots besides the game. Selectors are already used on the zustand stores.

## 10. Numbers

| Measure                                                 | Before                   | After                                                  |
| ------------------------------------------------------- | ------------------------ | ------------------------------------------------------ |
| Type errors                                             | 0                        | 0                                                      |
| Lint errors / warnings                                  | 0 / 1                    | 0 / 0                                                  |
| Unit tests                                              | 221 in 44 suites         | 231 in 47 suites                                       |
| Playwright e2e (`dist/`)                                | not run                  | 21 of 21 pass                                          |
| Route crawl: 45 routes × light/dark × 320, 390, 1280 px | not run                  | 0 console errors, 0 page errors, 0 crashes, 0 overflow |
| Prettier drift (hand-written files)                     | 40 files                 | 0                                                      |
| Web JS, all chunks                                      | 3,372 KB (785 KB gzip)   | 3,383 KB (788 KB gzip)                                 |
| Web entry chunk                                         | 1,181 KB (291.0 KB gzip) | 1,183 KB (291.0 KB gzip)                               |
| Web export time                                         | 2 min 52 s               | 2 min 12 s (warm cache, so not comparable)             |

The bundle is flat. The deletions were small, and the new strings and hooks weigh about the same. Startup time and slowest screens weren't measured. There's no native build here, and the dev server stalled on this machine, so I had no reliable timing. Bundle size is the only performance number I can stand behind.

## 11. What was fixed

| Finding                                                     | Status                                                                                                           | Commit                 |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------- |
| B1 no error boundary                                        | Fixed, then fixed again so the crash screen loads its fonts. Checked by building with one route forced to throw. | `fix(app)` ×2          |
| B2 sign-out kept owner data                                 | Fixed. Owner queries are removed at sign-out.                                                                    | `fix(privacy)`         |
| B3 everything persisted                                     | Fixed. Only `venue` and `menu` are saved, and old saves are discarded (buster `v2`). Checked in the browser.     | `fix(privacy)`         |
| B4 game score sent twice, fake duration, hidden Align cheat | Fixed                                                                                                            | `fix(game)`            |
| B5 manual stamp sends masked phone                          | Fixed: the member sheet sends staff to Scan (D3)                                                                 | `fix(loyalty)`         |
| B6 old waiter calls carried over                            | Fixed                                                                                                            | `fix(waiter)`          |
| B7 cart leaked across venues                                | Fixed                                                                                                            | `fix(cart)`            |
| B8 sales showed GH₵0.00 while loading                       | Fixed (shows only with payments on)                                                                              | `fix(owner)`           |
| B9 search per keystroke                                     | Fixed for feedback and loyalty members                                                                           | `perf(owner)`          |
| B10 signed-in owner saw sign-in                             | Fixed                                                                                                            | `fix(owner)`           |
| Table QR "Try again" went home, route not thin              | Fixed                                                                                                            | `fix(venue)`           |
| **New:** EXPO_PUBLIC_ values never reached a build          | Fixed. Checked by finding a marker value in the exported bundle.                                                 | `fix(env)`             |
| Hand-typed query keys                                       | Fixed: `guestKeys` plus a full `ownerKeys`, with tests                                                           | `refactor`             |
| Dead code (section 6)                                       | Deleted                                                                                                          | `chore`                |
| Hex colours on landing, not-found and game                  | Fixed where a theme value matched exactly                                                                        | `style`                |
| English in owner sign-in, members list, sheets, dialogs     | Moved to `en.json`                                                                                               | `fix(i18n)`            |
| `https://cravins.app` in screens, no-op `serviceHref`          | Fixed (`EXPO_PUBLIC_SITE_URL`)                                                                                   | `refactor(venue)`      |
| Lint warning, Prettier drift                                | Fixed                                                                                                            | `chore(i18n)`, `style` |

Not done, and why: the two kits stay separate (D1), there are no route groups (D2), the mock stays in every bundle (D8), and long owner lists aren't virtualised (that waits on server pagination).

## Decisions (made on Clarke's go-ahead, 3 Nov 2026)

Clarke asked for the recommended fix on every item.

| Item                                              | Recommendation                                                                                                                                  | Done                                                                                                                                                                                                                                        |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1. Merge the two component kits                  | Not now. About 150 files would move for no visible change.                                                                                      | No change                                                                                                                                                                                                                                   |
| D2. Route groups `(guest)`, `(owner)`, `(auth)`   | Skip. BUILD.md section 6 fixes the current layout, and URLs would not change.                                                                   | No change                                                                                                                                                                                                                                   |
| D3. Manual stamp and redeem sent the masked phone | Use Scan, which already takes a card code or full phone number. No contract change.                                                             | The member sheet's two buttons became "Stamp or redeem at Scan"                                                                                                                                                                             |
| D4. Hard-coded colours and guest loading          | Name every colour, without moving pixels on loaded screens. Skeletons while loading.                                                            | `SHADOW_INK`, `PHOTO_VEIL`, `QR_PAPER` in the palette; guest sheets use `theme.scrim` (slightly darker, matching the owner sheets); `LoadingState` is a page-shaped skeleton. Off-scale spacing numbers stay, so the renders still match.   |
| D5. Previews on sample data                       | Behind a flag, off by default, like payments.                                                                                                   | `PREVIEWS_ENABLED` hides Stock, AI waiter, Marketing and Register, and their routes redirect. The Register preview uses pesewas. The Feedback "Ask AI" tab is a real endpoint, not a preview: it stays, now translated, with an error line. |
| D6. `/dev` pages in production                    | Mock builds only.                                                                                                                               | `src/app/dev/_layout.tsx` redirects home unless `EXPO_PUBLIC_API_MODE=mock`. The gallery screenshots still work on mock builds.                                                                                                             |
| D7. Game loop redraws the whole screen            | Redraw only the board, with no change to tuning.                                                                                                | `GameBoard` owns the frame loop. The rest of the screen redraws only on a drop.                                                                                                                                                             |
| D8. Mock client in every bundle                   | Defer until the backend exists. The table entry, uploads and images import mock helpers too, so it is not a one-line change.                    | No change                                                                                                                                                                                                                                   |
| D9. Untranslated languages                        | **No fix needed. My audit was wrong.** Languages are marked `ready: false`, show "Coming soon", and can't be chosen, so the layout never flips. | No change                                                                                                                                                                                                                                   |
| D10. Share link included the table                | Share the venue page only.                                                                                                                      | Share copies `/slug`; the e2e test checks it.                                                                                                                                                                                               |
