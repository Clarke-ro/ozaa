# Owner app audit

Date: 1 Nov 2026 · Branch: `cursor/owner-app-402e` · Checked on web at 390×844 against the mock API.

Status key: **Complete** works end to end · **Skeleton** looks done but is partly fake, dead or broken · **Missing** not built.

The reference files named in the brief (`agent-prompt.md`, `candour-owner-features.md`, `guest-dashboard-walkthrough.md`, `screens/`) are not in this repo or on the design-skill branch, so gaps below are measured against the brief's feature list and `design/brand.md` section 8.

## 1. Baseline checks (before)

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | Pass |
| `npx expo lint` | **64 errors, 168 warnings**. Errors are unescaped quotes in JSX, `no-restricted-imports` (TablesScreen imports past the feature index), `no-explicit-any` in `mockClient.ts`. Warnings are mostly unused imports and state in owner screens. |
| `npx jest` | Pass, 77 tests in 24 suites |
| Runtime (web) | `<button> cannot contain a nested <button>` on every page that renders `DeskCard`/`ListRow` inside a `Pressable` (shown as a red error toast on most screens). |

## 2. Route map

All routes live in `src/app/owner/` and render one screen from `src/features/owner/`. The layout (`_layout.tsx`) redirects to `/owner/login` without a token and wraps everything else in `OwnerChrome`.

| Route | Screen | Reached from | Links to |
| --- | --- | --- | --- |
| `/owner/login` | OwnerLogin | redirect | `/owner` |
| `/owner` | DashboardScreen | tab "Today" | calls, scan, tables, menu, feedback, insights, loyalty |
| `/owner/floor` | FloorScreen | tab | (sheets only) |
| `/owner/orders` | OrdersScreen | tab | — |
| `/owner/calls` | CallsScreen | tab, dashboard bell | — |
| `/owner/more` | MoreScreen | tab | every route below |
| `/owner/menu` | MenuDeskScreen | More, dashboard | — |
| `/owner/loyalty` | LoyaltyHubScreen (via OwnerLoyalty) | More | scan, devices |
| `/owner/feedback` | FeedbackInboxScreen | More, dashboard | branding, socials |
| `/owner/services` | ServicesDeskScreen | More | — |
| `/owner/payments` | PaymentsScreen | More | — |
| `/owner/reviews` | ReviewsDeskScreen | More | — |
| `/owner/socials` | SocialsScreen | More | — |
| `/owner/links` | CustomLinksScreen | More | — |
| `/owner/tables` | TablesScreen | More, dashboard, settings | — |
| `/owner/branding` | BrandingScreen | More | — |
| `/owner/staff` | StaffScreen | More | — |
| `/owner/insights` | InsightsScreen | More, dashboard | — |
| `/owner/setup` | SetupScreen | More | — |
| `/owner/stock`, `/pos`, `/ai`, `/marketing` | product shells | More | — |
| `/owner/scan` | ScanStampScreen | More, dashboard, loyalty | — |
| `/owner/devices` | DevicesScreen | More, loyalty, settings | — |
| `/owner/business` | BusinessScreen | More, location switcher | — |
| `/owner/settings` | SettingsScreen | More | tables, devices, scan, business |

No route 404s. Structural problems:

- **No stack.** The layout uses `<Slot />`, so every screen is a sibling. Opening a screen from More has no back button on phones and no native back gesture. Tab taps call `router.push`, which piles up history.
- **Sign-in is lost on refresh.** The owner session is in memory only.
- **Tab bar is Today/Floor/Orders/Calls.** Menu, Loyalty and Feedback (the main owner jobs) are buried in More for owners.
- Labels `owner.feedback`, `owner.socials`, `owner.links`, `owner.settings` are missing from i18n and show as raw keys in More, the sidebar and the Settings title.

## 3. Foundations

| Area | Status | Problem |
| --- | --- | --- |
| Theme | Skeleton | `src/ui/theme.tsx` has one light palette. **No dark mode at all.** 335 hard-coded hex values in owner files, many off-brand (`#E5E7EB`, `#DC2626`, `#16A34A`, `#F59E0B`). `theme.white` doubles as page background and as text on filled buttons. |
| Type | Skeleton | `Inter_700` is used (wordmark, chips) but never loaded, so the "Ozaa" wordmark renders in a serif fallback. ~60 inline `fontSize` and `fontWeight` overrides instead of variants; synthetic bold on web. |
| Spacing | Skeleton | Mix of tokens and literals (6, 10, 14, 18, 128). |
| Shared components | Skeleton | `kit/` covers card, row, toggle, sheet, confirm, stat, tabs. Missing: toast, inline error state, list skeleton, screen header with back. `DeskCard` and `ListRow` render as buttons inside other buttons. |
| Data layer | Complete | `src/lib/api` is typed from the OpenAPI contract and every screen goes through it. Query keys are inconsistent strings; a few screens never invalidate after a save. |
| Navigation | Skeleton | See section 2. |
| Accessibility | Skeleton | Many icon buttons have no label; several tap targets are 32–36 px (edit/delete icons, range chips, location chip); colour is the only signal on the "available" toggles. |
| Motion and haptics | Skeleton | `Button` fires a selection haptic on every press. No success/error haptics. No Reduce Motion handling. |

## 4. Screen by screen

### Today (dashboard) · Skeleton
- **Wrong numbers.** When data is missing it invents them: `cardsEnrolled ?? 142`, `scansCount ?? 384`, `menuViewsCount ?? 920`, orders = `liveOrders + 45`, delta fallback `'+12%'`, venue name fallback "Mama's Kitchen". Average order is computed from the made-up 45.
- Quick-action labels truncate ("Scan & Sta…", "Table QR C…"); stat labels truncate ("Table Sc…").
- Range chips are 32 px tall. Six stat tiles in three columns squeeze at 390 px.

### Menu builder · Skeleton
- Works: categories and items create, edit, delete; available toggle; search; diet tags; allergens; modifiers.
- **No dish photos.** The item form has no photo field, and the mock ignores `photoMediaId`.
- **Typing gets wiped.** Both edit forms reset their fields inside `useMemo` keyed on an array the parent rebuilds every render, so a background refresh clears what the owner is typing.
- Broken or missing: **section reorder** (no control, though the contract has `position`); **draft/publish** (no contract support); **multiple menus** (the contract has one menu per venue with food/drinks tabs); "Mark all sold out (86)" is jargon on a live button; edit/delete icons are 32 px; 1,538 lines in one file.

### QR codes (Tables) · Skeleton
- Works: list, batch create, live card preview.
- Missing: **download** and **share** (icons imported, never used); print only works on web and falls back to `alert()` elsewhere. Action buttons overflow the screen at 390 px. Three filled buttons on one screen. Imports past the feature index (lint errors).

### Venue page design (Branding) · Skeleton
- Works: colour presets, font pair, live preview, style preset, button order, banner/logo upload.
- **Upload buttons are dead.** They ask for an upload slot with a made-up size, never pick a file, never upload, never save the result, then show "upload ready".
- Problems: 32 hard-coded colours; preview header overflows; preview follows dark mode although guest pages are always light; several filled buttons.

### Wi-Fi (Services) · Complete
- Wi-Fi name, password and security save through `ownerUpdateVenue`. Service switches save.

### Social links (Socials) · Skeleton
- Works: profile links save.
- **Review gating.** "Reputation protection gating" only invites 4–5★ guests to Google. Google's review policy prohibits that. Needs Clarke's decision (see section 6).
- Unused imports; unescaped quotes (lint errors).

### Custom links · Skeleton
- Create, edit, enable, delete with confirmation. Clicks shown.
- **Scheduling cannot be edited**: the form keeps start and end dates in state but has no inputs for them. No URL check, so `javascript:` links would be accepted.

### Loyalty · Skeleton
- Works: program saves, customer list, analytics tab, scan.
- **Fake defaults saved as real.** Empty fields are filled with sample rewards ("Free Jollof with Tilapia", "Welcome to Mama Kitchen!") that are saved on the first Save.
- Copy promises Apple and Google Wallet passes; there is no pass service in the contract.
- Tabs truncate ("Loya…"); two filled buttons at the top.

### Scan & stamp · Skeleton
- Native uses `expo-camera`. **Web shows "Web Camera Active" over a black box with no camera.** Manual entry works.

### Feedback inbox · Skeleton
- Works: new/archived list, search, archive.
- **Two switches do nothing** ("Private feedback box", "Allow phone number"): local state only, not in the contract.
- **No replies.** The contract has no reply endpoint for private feedback. The guest's phone, when they chose to leave it, is shown but not actionable.

### Analytics (Insights) · Skeleton
- Works: range switch, revenue bars, top dishes.
- Bars have no values or accessibility labels; "Sample" badge sits on real mock data; 16 hard-coded colours.

### Locations (Business) · Complete
- Create and edit locations, edit legal name, switch active location. Page title reads "Business name" (a field label).

### Account and settings · Skeleton
- Title shows raw key `owner.settings`. Unused imports and state. (Delete account uses `deleteAccount`, which *is* in the contract outside the `/owner` paths.)

### Floor, Orders, Calls, Payments, Reviews, Staff, Devices, Setup · Complete
- Wired to the API with confirmation on refunds and revokes. Shared issues only (hard-coded colours, small icon targets, nested buttons).

### Stock, Register (POS), AI waiter, Marketing · Skeleton by design
- Product previews with sample data and a "Coming in…" tag. Correctly marked as previews; out of scope.

## 5. Plan

1. Foundations: dark-aware role colours in the theme, load the missing font weight, fix the nested buttons, add toast and inline states.
2. Navigation: a native stack inside the owner chrome with a back button on detail screens; role-based tabs (owners get Today, Orders, Menu, Loyalty, More); persist the owner session.
3. Screens, most broken first: Dashboard numbers, Tables share/download, Feedback dead switches, Loyalty fake defaults, Scan on web, Menu reorder, Settings title, Insights chart labels.
4. Polish: tap targets, labels, haptics, Reduce Motion.
5. Verify and fill in section 7.

## 6. Needs Clarke's decision

- **Review gating** on the Socials screen (Google policy).
- **Menu draft/publish and multiple menus**: needs a contract change.
- **Feedback replies and the two feedback switches**: needs a contract change.
- **Wallet passes**: the loyalty copy promises Apple/Google Wallet with no backend.
- **Native modules**: photo upload on phones needs `expo-image-picker`; printing and saving QR cards on phones need `expo-print` and `expo-sharing`. Not installed without his OK.
- **Sales comparison wording**: the contract says `changePercent` is versus yesterday; the brand sentence says "than last Saturday". The screen uses the brand sentence.

## 7. Before and after

Checked on 2 Nov 2026 with `npx tsc --noEmit`, `npx expo lint`, `npx jest`, the owner Playwright spec, and a screenshot crawl of all 26 owner routes in light and dark at 320, 390 and 1280 px wide (no console errors, no horizontal overflow, no misrouted page).

| Check | Before | After |
| --- | --- | --- |
| Type-check | Pass | Pass |
| Lint | 64 errors, 168 warnings | 0 errors in owner code. 1 warning left, in `src/i18n/index.ts` (not owner) |
| Unit tests | 77 | 132, all passing |
| Owner e2e (`e2e/owner.spec.ts`) | Clicked tabs that no longer match | Rewritten; opens all 25 owner screens and checks Back on each. 2/2 pass |
| Hard-coded colours in owner code | 335 | 31, all intentional: colour choices offered to the owner (branding presets, loyalty card and QR card swatches), the fixed black-on-white QR, and shadow colours |

| Area | Before | After | What changed |
| --- | --- | --- | --- |
| Theme | Skeleton | Complete | One palette by role (`src/theme/palette.ts`) with light and dark, contrast tested. `makeStyles` for theme-aware styles. Owner app follows the phone setting; guest pages stay light. Missing font weight mapped centrally in `Text`. |
| Navigation | Skeleton | Complete | Native stack inside the owner chrome. Back button + swipe on detail screens. Role-based tabs (owner: Today, Orders, Menu, Loyalty, More). Grouped More screen and sidebar. Sign-in kept across refresh (Keychain/Keystore on phones, `sessionStorage` on web). Raw i18n keys fixed. |
| Shared components | Skeleton | Complete | Added toast, segmented control, accessible bar chart, photo field, skeleton loading, error state with retry, destructive button. Nested-button error fixed. 44 pt targets on close/icon buttons. |
| Today | Skeleton | Complete | No invented numbers. Real live counts, alerts that open the right screen, correct "vs" sentence, trends with their own range and readable bars. |
| Menu builder | Skeleton | Complete except draft/publish and multiple menus | Section reorder, dish photos (web), instant sold-out switch with rollback, confirm before "All sold out", typing no longer wiped. |
| QR codes | Skeleton | Complete on web; share-only on phones | Share link everywhere; download SVG and print on web. QR always black on white. Add tables by range or names with checks. |
| Venue page design | Skeleton | Complete on web | Real banner and logo upload saved with the design; preview always light in the venue colour. |
| Wi-Fi | Complete | Complete | Shared fixes only. |
| Social links | Skeleton | Skeleton | Copy and lint fixed. Review gating left as is for Clarke (section 6). |
| Custom links | Skeleton | Complete | Schedule fields, web-only URL check, inline errors, save toasts. |
| Loyalty | Skeleton | Complete except wallet passes | No sample text saved as real settings; validation; one filled button; shorter tabs. |
| Scan & stamp | Skeleton | Complete on phones; manual entry on web | Honest web message, real stamp target from the program, labels. |
| Feedback inbox | Skeleton | Complete except written replies | New/Archived/Ask AI, search, mood shown by icon and word, Call guest when they left a number. Dead switches removed. |
| Analytics | Skeleton | Complete | Values on every bar, spoken chart summary, dark-mode chip fix. |
| Locations | Complete | Complete | Title fixed. |
| Account & settings | Skeleton | Complete | Title, dark-mode avatar, unused state removed. |
| Floor, Orders, Calls, Payments, Reviews, Staff, Devices, Setup | Complete | Complete | Shared theme, dark mode and lint fixes. |
| Stock, Register, AI waiter, Marketing | Preview | Preview | Marked "Preview" in More. |

### Still open
- `MenuModals.tsx` (812 lines), `BrandingScreen.tsx`, `LoyaltyHubScreen.tsx`, `SettingsScreen.tsx` and `BusinessScreen.tsx` are still over 200 lines and should be split.
- Many older screens still have English copy inline instead of in `en.json`; other languages fall back to English for owner pages.
- Not run on a physical iPhone or Android phone in this session; checked on web only (see the report).

## 8. Second round (2 Nov 2026)

Clarke's decisions and requests, and what changed:

| Request | Change |
| --- | --- |
| Remove the review part of Social links | Google review link and star gating removed from the owner screen; saving clears any saved Google link. The contract still describes the 4–5★ rule (`createReview` summary); updating it is a separate contract PR. |
| Remove video reviews | Guest record and story pages, their screens and the "Guests are saying" row are gone. Owner Reviews is now written reviews only: average, All / Needs reply, reply on each. Video endpoints remain in the contract, client and mock for a separate contract PR. |
| Full-screen Add dish | New `DishEditor`: full screen on phones, Save pinned at the bottom, sections for basics, section, diet, allergens, add-ons. |
| Page titles in the header | The Ozaa + location bar shows on Today only. Other pages put Back, the title and their one action in a pinned header. Page subtitles removed. |
| Floor cards | Colour per status family (free green, occupied blue, paying amber, calling red) with a fine grain, an icon and a word on every card, and a legend. Contrast tested. |
| Loyalty too cumbersome | Three short sections (stamp card, between stamps, treats), live stamp preview, Save bar. Wallet-pass design and the review-reward automation removed from the screen; saved values are kept. |
| Guest page info too big | Compact intro: smaller name and description (2 lines, More), hours and location as chips, location opens maps, real logo shown when set. Section headings smaller. |
| Still-to-do splits | `MenuModals` (812 lines), Branding, Loyalty, Settings, Business and Services rebuilt as small files on shared `Section` / row / `SaveBar` / `useDraft` pieces, with copy in `en.json`. |

Bugs found and fixed on the way:
- Sections set to "every day" were hidden on Sundays (owner saved Sunday as 7, guest menu reads 0).
- Add-on prices could not take decimals (the field re-formatted on each keystroke).
- Settings: "Report a bug" sent nothing; the WhatsApp support number was a placeholder; untranslated languages were selectable. Removed or fixed.
- Services: waiter-call reasons were never saved. Removed.
- Guest review form started at 4 stars with "food" picked and could post the same review repeatedly.
- Guest order bar showed a made-up "about 12 min" and ignored the home-indicator area.
- `OwnerLoyaltySetup.tsx` was unused; deleted. `e2e/loyalty.spec.ts` checked text that no longer existed; updated.

Checks after this round: type-check clean, lint clean on all touched code, 157 unit tests, 18 e2e tests (owner, loyalty, guest screens, menu filters, home banner) all pass, and the 26-route crawl shows no errors in light, dark and wide.

Still open: Branding's preview does not yet use the new compact guest intro; CustomLinks, Staff, Setup, Insights, LoyaltyCustomers, Scan, Devices and the preview shells are still over 200 lines with some inline copy.
