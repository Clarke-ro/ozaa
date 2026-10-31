# Owner (Seller) Side & Web Landing Page — Phase 0 Audit & Gap Analysis

**Date:** 2026-10-31  
**Project:** Ozaa (QR Table App for Ghana)  
**Author:** Pair programming with Clarke  
**Status:** Phase 0 Complete — Under Review (No feature code implemented until approved)

---

## 1. Tech Stack Detection

| Layer | Detected Technology & Version | Location / Configuration |
|---|---|---|
| **App Name** | **Ozaa** (Never TakeOrder or ScanChop) | `app.config.ts`, `package.json`, `design/brand.md` |
| **Expo SDK** | **Expo SDK ~58.0.22** (React Native `0.88.1`, React `19.3.0`, New Architecture enabled) | `package.json`, `app.config.ts` |
| **Router / Navigation** | **Expo Router ~58.0.29** (File-based routing in `src/app/`, single-page Metro web output) | `src/app/_layout.tsx`, `src/app/owner/_layout.tsx`, `src/features/owner/chrome/` |
| **State Layer** | **Zustand ^5.0.16** (Client session, cart, active order), `@tanstack/react-query ^5.105.0` (Server cache) | `src/features/session/`, `src/features/cart/`, `src/lib/api/` |
| **Data Layer & Persister** | `@tanstack/query-async-storage-persister` + `@react-native-async-storage/async-storage` | `src/lib/queryClient.ts`, `src/lib/offline/` |
| **Backend & Contract** | **OpenAPI 3.1.0** at `api/openapi.yaml`, typed via `openapi-typescript`. Runtime mock server with in-memory fixtures. Paystack sandbox slice in Phase 2b; Postgres/Drizzle backend in Phase 5. | `api/openapi.yaml`, `src/lib/api/schema.ts`, `src/mocks/world.ts`, `src/mocks/mockClient.ts` |
| **Auth** | Ghana phone SMS OTP (`/auth/otp/request`, `/auth/otp/verify`). Tokens: Bearer access token (`acc_...`) + refresh token (`ref_...`). | `src/features/owner/OwnerLogin.tsx`, `src/lib/api/` |
| **Storage** | Media uploads via presigned URLs (`/owner/venues/{venueId}/media`). Upload slots: banner, logo, dish photos. | `api/openapi.yaml`, `src/mocks/media.ts` |
| **i18n** | `i18next ^24.2.2`, `react-i18next ^15.4.1`, `expo-localization ^17.0.7`. Locales: `en`, stubbed `tw`, `ga`, `ee`, `fr`. | `src/i18n/`, `src/i18n/locales/en.json` |
| **Theme & Design Tokens** | Custom design system generated from `design/tokens.json`. Base: Black (`#111111`) & White (`#FFFFFF`). Brand Orange: `#FC5205` (large surfaces/logo), Deep Orange: `#D24000` (buttons/icons/links with text). Dynamic contrast engine (`deriveTheme.ts`). | `src/theme/tokens.ts`, `src/features/theming/deriveTheme.ts`, `src/ui/theme.tsx` |
| **Component Library** | Custom UI library in `src/ui/` (`Button`, `Text`, `Screen`, `SafeScreen`, `VenueImage`) and shared owner desk kit in `src/features/owner/kit/` (`DeskCard`, `StatTile`, `BigStat`, `StatusPill`, `Toggle`, `DeskTabs`, `Field`, `CodeTile`, `IconTile`, `ChipRow`, `QuickAction`, `SectionLabel`, `OzaaMark`). | `src/ui/`, `src/features/owner/kit/` |
| **Landing Page Stack** | **Astro 5.16.8** (Static Site Generation), Tailwind CSS 4.1.18, Lucide React icons, Inter & Unbounded webfonts. | `landing/package.json`, `landing/astro.config.mjs`, `landing/src/` |

---

## 2. Screen & Route Mapping (Current Owner App)

| Route Path | Screen Component | Rendered Content | Data Read | Data Written | States Handled (Loading / Empty / Error / Saving) |
|---|---|---|---|---|---|
| `/owner` | `DashboardScreen.tsx` | Today's net sales, active orders count, avg order, rating average, live alerts, live orders list (top 4), shortcuts. | `ownerGetDashboard`, `ownerGetVenue`, `ownerListOrders` | None directly (links to other screens) | 🟢 Loading: `DeskWait`<br>🟡 Empty: partial ("No open orders")<br>🟢 Error: retry button<br>⚪ Saving: N/A |
| `/owner/floor` | `FloorScreen.tsx` | Live floor table grid, table occupancy status, active table orders, cash payment collection modal. | `ownerGetFloor`, `ownerListOrders`, `ownerGetVenue` | `ownerSetOrderStatus`, `ownerRecordCashPayment` | 🟢 Loading: `DeskWait`<br>🟡 Empty: "No tables found"<br>🟢 Error: retry button<br>🟡 Saving: modal button spinner |
| `/owner/orders` | `OrdersScreen.tsx` | KDS live order ticket board, tabs: All, Received, Preparing, Ready, Served. Table code, order lines, status progression actions. | `ownerListOrders`, `ownerGetVenue` | `ownerSetOrderStatus` | 🟢 Loading: `DeskWait`<br>🟢 Empty: `t('owner.noOrders')`<br>🟢 Error: retry button<br>⚪ Saving: optimistic mutation |
| `/owner/calls` | `CallsScreen.tsx` | Waiter assistance calls queue. Active vs All tabs. Table number, call reason, elapsed time, Acknowledge and Resolve actions. | `ownerListWaiterCalls` | `ownerUpdateWaiterCall` | 🟢 Loading: `DeskWait`<br>🟢 Empty: `t('owner.noCalls')`<br>🟢 Error: retry button<br>⚪ Saving: instant update |
| `/owner/menu` | `MenuDeskScreen.tsx` | Menu items list, Food vs Drinks tabs, Category dropdown filter, 86 availability toggle, dietary tag pills, quick add item (name + price). | `getMenu`, `ownerGetVenue` | `ownerUpdateItem`, `ownerCreateItem` | 🟢 Loading: `DeskWait`<br>🟡 Empty: empty items text<br>🟢 Error: retry button<br>🟡 Saving: add item button disabled when empty |
| `/owner/services` | `ServicesDeskScreen.tsx` | Module toggles (menu, waiter calls, bill, wifi, loyalty, reviews, game), basic Wi-Fi credentials form (SSID, password). | `ownerGetServices`, `ownerGetVenue` | `ownerSetServices`, `ownerUpdateVenue` | 🟢 Loading: `DeskWait`<br>🟢 Empty: default fallbacks<br>🟢 Error: retry button<br>🟢 Saving: inline save button |
| `/owner/payments` | `PaymentsScreen.tsx` | Transaction ledger (MoMo, Card, Cash), settlement status (settled, pending, refunded), refund transaction modal. | `ownerListTransactions`, `ownerGetPayoutAccount` | `ownerRefundTransaction` | 🟢 Loading: `DeskWait`<br>🟢 Empty: "No transactions found"<br>🟢 Error: retry button<br>🟡 Saving: refund dialog |
| `/owner/reviews` | `ReviewsDeskScreen.tsx` | Video review moderation (pending, featured, hidden) and written reviews list with owner reply composer. | `ownerListVideoReviews`, `ownerListWrittenReviews` | `ownerModerateVideoReview`, `ownerReplyToReview` | 🟢 Loading: `DeskWait`<br>🟢 Empty: "No reviews yet"<br>🟢 Error: retry button<br>🟢 Saving: reply submit button |
| `/owner/tables` | `TablesScreen.tsx` | Scannable table QR cards list, SVG QR code preview, tent card mockup, batch add table codes (comma-separated). | `ownerListTables`, `ownerGetVenue` | `ownerCreateTables` | 🟢 Loading: `DeskWait`<br>🟡 Empty: table list fallback<br>🟢 Error: retry button<br>🟢 Saving: add button |
| `/owner/branding` | `BrandingScreen.tsx` | Theme accent colour presets + hex input, venue name & description, cover banner and logo image upload, live guest phone preview. | `ownerGetVenue` | `ownerSetTheme`, `ownerUpdateVenue`, `ownerCreateMediaUpload` | 🟢 Loading: `DeskWait`<br>🟢 Empty: default placeholders<br>🟢 Error: retry button<br>🟡 Saving: save button disabled until dirty |
| `/owner/staff` | `StaffScreen.tsx` | Team members list with role badges (waiter, kitchen, manager), invite staff member by Ghana phone + first name. | `ownerListStaff` | `ownerInviteStaff` | 🟢 Loading: `DeskWait`<br>🟡 Empty: "No staff members yet"<br>🟢 Error: retry button + error banner<br>🟢 Saving: invite button |
| `/owner/insights` | `InsightsScreen.tsx` | Sales revenue metrics, 7d/30d series bar chart, peak ordering hours, top selling menu dishes. | `ownerGetInsights` | None | 🟢 Loading: `DeskWait`<br>🟡 Empty: chart empty state<br>🟢 Error: retry button<br>⚪ Saving: N/A |
| `/owner/setup` | `SetupScreen.tsx` | 4-step initial onboarding wizard: 1. Venue Details, 2. Table Codes, 3. Wi-Fi credentials, 4. MoMo Payout Account. | `ownerGetVenue` | `ownerUpdateVenue`, `ownerCreateTables`, `ownerSetPayoutAccount` | 🟢 Loading: `DeskWait`<br>🟢 Empty: defaults<br>🟢 Error: retry button<br>🟢 Saving: step navigation buttons |
| `/owner/loyalty` | `OwnerLoyalty.tsx` & `OwnerLoyaltySetup.tsx` | Basic stamps/points switch, On/Off toggle, 6-character claim code redemption input, members list with stamp facts. | `ownerGetLoyalty`, `ownerListLoyaltyMembers` | `ownerSetLoyalty`, `ownerConfirmRedemption` | 🟢 Loading: skeleton/spinner<br>🟡 Empty: "No members yet"<br>🟢 Error: inline error message<br>🟢 Saving: save button |
| `/owner/more` | `MoreScreen.tsx` | Grid of navigation tiles linking to all secondary desk tools and product shells. | None directly (reads local session role) | None | 🟢 Static launcher (no loading/error) |
| `/owner/pos` | `productShells.tsx` (`PosShell`) | Prototype counter ordering: tap dishes to build ticket, select cash/momo tender. "COMING IN PHASE 3". | Static in-memory mock items | Local React state only | 🟡 Prototype skeleton |
| `/owner/stock` | `productShells.tsx` (`StockShell`) | Prototype inventory watcher with remaining counts and Auto-86 note. "COMING IN PHASE 3". | Static in-memory array | None | 🟡 Prototype skeleton |
| `/owner/ai` | `productShells.tsx` (`AiShell`) | Prototype multilingual ordering chat (EN, Twi, Ga). "COMING IN PHASE 3". | Static in-memory strings | Local React state only | 🟡 Prototype skeleton |
| `/owner/marketing` | `productShells.tsx` (`MarketingShell`) | Prototype opt-in guest SMS audience broadcast. "COMING IN PHASE 3". | Static in-memory strings | None | 🟡 Prototype skeleton |
| `/owner/login` | `OwnerLogin.tsx` | Owner & staff authentication screen: Ghana phone number input, 6-digit OTP entry, demo test accounts quick-picker. | None (calls OTP endpoints) | `requestOtp`, `verifyOtp` | 🟢 Loading: button activity spinner<br>🟢 Empty: form inputs<br>🟢 Error: inline error banner<br>🟢 Saving: submit button |

---

## 3. Data Model Gap Analysis (Current OpenAPI Contract vs Target)

| Domain | Currently Present in `api/openapi.yaml` | Missing Entities & Fields Required for Target Reference Features |
|---|---|---|
| **Feedback Inbox** | Single guest endpoint: `POST /feedback` (`message`, `contactPhone`). | - Owner inbox listing: `GET /owner/venues/{venueId}/feedback`<br>- Entity fields: `id`, `sentiment` (`positive`, `neutral`, `negative`), `score`, `text`, `photoUrl`, `contactName`, `contactPhone`, `archived` (boolean), `createdAt`, `visibleAfter` (timestamp for anonymity delay)<br>- Actions: `PATCH /owner/venues/{venueId}/feedback/{id}/archive` (archive / unarchive)<br>- Toggle: `feedbackEnabled` on venue settings, `allowContactForNegative` toggle<br>- AI query endpoint: `POST /owner/venues/{venueId}/feedback/ask` |
| **Venue Design** | `VenueSettings` has `name`, `description`, `location`, `theme` (`accent`, `fontPair`). | - `tagline`: short tagline distinct from long description<br>- `title`: customizable landing page title falling back to business name<br>- `buttonTint`: `'auto' \| 'light' \| 'dark'`<br>- `stylePreset`: `'default' \| 'classic' \| 'editorial' \| 'modern'`<br>- `buttonOrder`: array of button IDs (e.g. `['menu', 'wifi', 'loyalty', 'feedback', 'socials', 'links']`)<br>- `coverImage` / `logoImage` explicit fields with crop metadata |
| **Loyalty Program** | `LoyaltyProgram` has `earn` (`stamps` or `points`), `tiers`, `rewards`. `LoyaltyMember` has ledger `facts`. | - Two distinct program types: **Rewards Pass** (`rewards_pass`) and **Stamp Card** (`stamp_card`)<br>- Stamp Card: `cooldown` (`'none' \| '1h' \| '4h' \| '1d'`), `stampsRequired` (default 10), optional second tier reward, appearance (`bgHex`, `textHex`, `coverUrl`, `logoUrl`), lock screen message (`lockscreenMessage` max 60 chars)<br>- Rewards Pass: automations object (`welcomeReward`, `birthdayReward`, `winbackRewardDays`, `reviewAskReward`)<br>- Loyalty Analytics: 7d/30d/90d aggregate metrics (`enrolledCount`, `stampsIssued`, `rewardsRedeemed`, `newEnrollments`, daily series)<br>- Customer list filter: `wantsOffers` boolean, `lastStampAt` timestamp, export CSV endpoint/function<br>- Scan & stamp endpoint: `POST /owner/venues/{venueId}/loyalty/scan` |
| **Reviews & Social Links** | `POST /reviews` (guest written review), `ownerListWrittenReviews`, `ownerListVideoReviews`. | - `googleReviewUrl`: validated URL + `googleReviewMinStars` threshold (e.g. 4-5 stars route to Google, 1-3 stars route to private feedback)<br>- Social links entity: `instagram`, `facebook`, `tiktok`, `tripadvisor`, `x`, `youtube`, `whatsapp`, `phone`, `email`, `website`<br>- Per-link `enabled` toggle and display order |
| **Menu Builder** | `MenuCategory` (`id`, `name`, `kind`), `MenuItem` (`id`, `name`, `pricePesewas`, `available`, `dietary`). | - Categories: `sortOrder`, `schedule` (e.g. `days`, `startTime`, `endTime`, e.g. Lunch 12:00–15:00), `hidden` toggle<br>- Items: `description`, `photoUrl`, `allergens` (14 standard allergens: celery, gluten, crustaceans, eggs, fish, lupin, milk, molluscs, mustard, nuts, peanuts, sesame, soya, sulphites), `calories`<br>- Modifier Groups: `ModifierGroup` (`id`, `name`, `minChoices`, `maxChoices`, `options: { id, name, pricePesewas }[]`)<br>- Multiple Menus: `menus` entity with `status` (`'draft' \| 'published'`), `schedule`, multiple active menus switcher (e.g. Food, Drinks, Specials) |
| **Wi-Fi & Table Services** | `Wifi` (`ssid`, `password`, `security: 'WPA'`). `ServiceSettings` has predefined toggles. | - Wi-Fi: `security` enum (`'WPA' \| 'WPA2' \| 'WPA3' \| 'WEP' \| 'OPEN'`), `hiddenNetwork` boolean toggle, generated QR connection string (`WIFI:T:...;S:...;P:...;H:...;;`)<br>- Services: Granular waiter call types (call waiter, ask for bill, water, custom requests) |
| **Custom Links** | None exists. | - Entity `CustomLink`: `id`, `venueId`, `title`, `url`, `icon` (globe, calendar, tag, instagram, custom), `placement` (`'button' \| 'banner' \| 'menu'`), `startDate`, `endDate`, `sortOrder`, `clickCount` |
| **Table Management & QR** | `Table` (`id`, `code`, `label`, `qrUrl`). | - Batch range generator input: `start: number`, `end: number`, `prefix?: string`<br>- Custom labels: Patio 1, Bar A, VIP Lounge<br>- Card customization settings: `templateStyle` (`'folded_tent' \| 'sticker' \| 'acrylic_stand'`), `accentColor`, `ctaText` (e.g. "Scan for Menu & Pay"), venue logo embedding<br>- Print PDF generator endpoint / client utility (A6 table tent, sticker sheet) |
| **Home & Analytics** | `ownerGetDashboard` (sales today, open tables, live orders, open calls). `ownerGetInsights` (sales series, peak hours, top items). | - 7d / 30d / 90d range selectors<br>- Key KPIs: Cards enrolled, Currently active, Reward-ready, Redeemed, Scans, Menu views<br>- Dual chart breakdowns: Feedback sentiment per day (stacked positive/neutral/negative) & Loyalty enrollments + stamps per day |
| **Business & Locations** | Scoped strictly to single `venueId`. No parent business. | - `Business` entity: `id`, `name`, `ownerId`<br>- `Location` entity: `id`, `businessId`, `slug`, `name`, `email`, `phone`, `address1`, `address2`, `city`, `postcode`, `country`, `currency`<br>- Header location switcher state in session<br>- Add location flow: "Another location of this business" vs "A separate business" |
| **Team & Permissions** | Single-venue `ownerListStaff` / `ownerInviteStaff` with Ghana phone only. Roles: `owner`, `manager`, `waiter`, `kitchen`. | - Roles expanded: `owner`, `manager`, `viewer`, `staff-scanner`<br>- Invite by email or phone, with revocation action (`DELETE /owner/venues/{venueId}/staff/{id}`)<br>- Granular permission gates: Viewers cannot edit; Staff-scanners only access scanner mode |
| **Account & Scanner Devices** | `StaffUser` (`id`, `role`, `name`, `phone`). No scanner pairing tokens. | - `ScannerDevice` entity: `id`, `venueId`, `name`, `pairedAt`, `lastSeen`, `pairingCode` (6-digit, 10 min TTL)<br>- Scanner mode profile toggle (locks UI to full-screen camera card lookup & stamp/redeem)<br>- Account deletion with type-to-confirm dialog (`DELETE /auth/account`) |

---

## 4. Master Feature Gap Table

Status legend:  
🟢 **Complete** (matches target specifications and works reliably)  
🟡 **Skeleton** (partial implementation, mock data, or missing sub-features)  
🔴 **Missing** (route, screen, or data entity does not exist)

| # | Feature | Screen / Route | Status | What Exists in Repo | What Is Needed | Required Data Changes | Effort |
|---|---|---|:---:|---|---|---|:---:|
| **1** | **Feedback Inbox** | `/owner/feedback`<br>`/owner/feedback/ai` | 🔴 Missing | Guest `POST /feedback` endpoint exists in API schema. | - Full inbox screen with On/Off switch for feedback box<br>- Dismissible 4-card setup checklist<br>- "Make things right" toggle (contact unhappy diners)<br>- Search, New / Archived tabs, item count<br>- Item card: sentiment chip, date, text, photo, contact, swipe/button to archive<br>- Anonymity visibility delay enforcement<br>- AI assistant screen ("Ask Ozaa") with 4 prompt chips and chat grounded on feedback | - Add `FeedbackItem` schema (`id`, `venueId`, `sentiment`, `score`, `text`, `photoUrl`, `contactPhone`, `archived`, `visibleAfter`, `createdAt`)<br>- Add endpoints `GET /owner/venues/{venueId}/feedback`, `PATCH .../archive`, `POST .../ask`<br>- Add fixtures and mock handlers in `src/mocks/` | **L** |
| **2** | **Venue Page Design** | `/owner/branding` | 🟡 Skeleton | `BrandingScreen.tsx` supports accent color presets + hex, venue name, description, banner & logo upload, and a live phone mockup. | - Fallback title logic (`title` falling back to business name)<br>- Tagline input<br>- Button tint radio: Auto / Light / Dark with WCAG AA validation<br>- 3–4 style presets with font/card preview samples<br>- Drag-to-reorder for landing page action buttons<br>- Responsive preview: bottom sheet on phone, side column on desktop<br>- QR preview code | - Add `tagline`, `buttonTint`, `stylePreset`, `buttonOrder` to `VenueTheme` / `VenueSettings`<br>- Add update endpoint support | **M** |
| **3** | **Loyalty Hub & Operations** | `/owner/loyalty`<br>`/owner/loyalty/pass`<br>`/owner/loyalty/stamp-card`<br>`/owner/loyalty/customers`<br>`/owner/loyalty/analytics`<br>`/owner/loyalty/scan` | 🟡 Skeleton | `OwnerLoyalty.tsx` & `OwnerLoyaltySetup.tsx` have stamps vs points toggle and manual 6-character claim code entry. | - Hub screen to choose Rewards Pass vs Stamp Card (with irreversible stamp card warning confirm)<br>- Rewards Pass designer: colours, logo, lock-screen proximity message (≤60 chars), 4 automations (welcome, birthday, win-back, review ask)<br>- Stamp Card designer: reward name, stamps required (default 10), 2nd tier, cooldown (none, 1h, 4h, 1d), lockscreen message<br>- Loyalty analytics: 7/30/90d range, tappable KPI cards, 3 trend charts<br>- Customers desk: list sorted by last stamp, "wants offers" filter, CSV export, customer history modal, manual stamp/redeem<br>- Camera Scan & Stamp: live QR scanner with instant +1 stamp and cooldown enforcement | - Expand `LoyaltyProgram` in `openapi.yaml` with `cooldown`, `lockscreenMessage`, `automations`<br>- Add `customers` query with `wantsOffers` & `lastStampAt`<br>- Add `loyaltyAnalytics` endpoint / mock aggregation<br>- Implement cooldown validation rule in server/mock | **L** |
| **4** | **Reviews & Social Links** | `/owner/reviews`<br>`/owner/socials` | 🟡 Skeleton | `ReviewsDeskScreen.tsx` handles video review moderation and written review replies. | - Google Review URL input with validation and "how to find" helper sheet<br>- Star rating gate: set min stars (e.g. 4–5★) to route to Google, lower to private feedback<br>- Social profiles manager: Instagram, Facebook, TikTok, TripAdvisor, WhatsApp, X, phone, email, website<br>- Toggle on/off and reorder per link<br>- Instant guest page reflection | - Add `socials` entity to `VenueSettings` (`googleReviewUrl`, `googleReviewMinStars`, `instagram`, `facebook`, `tiktok`, `tripadvisor`, `whatsapp`, etc.)<br>- Add update endpoints and fixture storage | **M** |
| **5** | **Menu Builder** | `/owner/menu`<br>`/owner/menu/[id]`<br>`/owner/menu/qr` | 🟡 Skeleton | `MenuDeskScreen.tsx` supports Food/Drinks tabs, category dropdown filter, availability toggle, and quick add (name + price). | - Category management: add, rename, reorder, hide/show, optional hours schedule (e.g. Lunch 12–15)<br>- Item editing: description, price in pesewas, photo upload, 14 standard allergens chips, dietary tags<br>- Modifier groups editor: "Choose your side", min/max required, add-on prices<br>- Search items, bulk 86 (sold out) toggle, drag-to-reorder items<br>- Multiple menus support (Draft / Published, e.g. Lunch, Dinner, Drinks)<br>- Location QR shortcut screen | - Add `allergens`, `calories`, `photoUrl` to `MenuItem`<br>- Add `ModifierGroup` and `ModifierOption` schemas<br>- Add `schedule` to `MenuCategory`<br>- Add `menus` collection supporting draft/published status | **L** |
| **6** | **Wi-Fi & Table Services** | `/owner/services` | 🟡 Skeleton | `ServicesDeskScreen.tsx` has toggle list for preset guest services and basic SSID/password fields. | - Security select dropdown: WPA, WPA2 (default), WPA3, WEP, Open<br>- Hidden network toggle checkbox<br>- Test copy button and live Wi-Fi QR generator string test<br>- Table services refinement: separate water request, bill request, custom requests toggle | - Update `Wifi` schema in `openapi.yaml` to include `security: 'WPA' \| 'WPA2' \| 'WPA3' \| 'WEP' \| 'OPEN'` and `hidden: boolean`<br>- Add custom requests configuration to `ServiceSettings` | **S** |
| **7** | **Custom Links** | `/owner/links` | 🔴 Missing | None. | - Custom links manager: Add, edit, drag reorder<br>- Fields: Title, URL, icon picker / emoji<br>- Placement options: button on venue page, top banner, inside menu<br>- Scheduling: start / end dates (e.g. weekend brunch)<br>- Click analytics counter display | - Add `CustomLink` schema (`id`, `venueId`, `title`, `url`, `icon`, `placement`, `startDate`, `endDate`, `sortOrder`, `clicks`)<br>- Add CRUD endpoints under `/owner/venues/{venueId}/links` | **M** |
| **8** | **Orders & Live Calls** | `/owner/orders`<br>`/owner/calls` | 🟢 Complete / 🟡 Polish | Both screens have working tabs, real-time status transitions, time elapsed counters, and role-based permissions. | - Display item modifier options on order ticket cards<br>- Add sound/vibration alert toggles for new orders and incoming waiter calls<br>- Filter for dine-in vs takeaway orders | - Add modifier selections to `OrderLine` in `Order`<br>- Client-side audio/haptic alert settings in session store | **S** |
| **9** | **QR & Table Cards** | `/owner/tables` | 🟡 Skeleton | `TablesScreen.tsx` lists tables, generates SVG QR on screen, and shows tent card mockup. | - Table number range generator (e.g. create tables 1–30 in one tap)<br>- Custom table labels (Bar 1, Patio A, VIP)<br>- Center venue logo embedding inside QR codes<br>- Table card customizer: template styles (folded tent, sticker, acrylic stand), accent colour, CTA text ("Scan for Menu & Pay")<br>- Export formats: High-res PNG, SVG, printable PDF table-card batch | - Add `tableRangeCreate` endpoint or client generator<br>- Add `qrCardCustomization` settings to venue settings<br>- Add client PDF generator utility using `expo-print` and `expo-sharing` | **M** |
| **10** | **Analytics / Home** | `/owner`<br>`/owner/insights` | 🟡 Skeleton | `DashboardScreen.tsx` shows today's sales; `InsightsScreen.tsx` shows 7d/30d revenue bar chart and peak hours. | - Range selector: 7d / 30d / 90d<br>- Unified KPI cards: Cards enrolled, Currently active, Reward-ready, Total redeemed, Scans, Menu views<br>- Chart 1: Feedback per day by sentiment (stacked bars linking to Feedback inbox)<br>- Chart 2: Loyalty enrollments + stamps per day (linking to Loyalty analytics)<br>- Skeletons for loading states | - Add `scansCount`, `menuViewsCount`, `loyaltyMetrics`, and `feedbackSentimentSeries` to `InsightsReport`<br>- Wire mock generator to return seeded 7d/30d/90d distributions | **M** |
| **11** | **Business & Locations** | `/owner/business`<br>`/owner/staff` | 🟡 Skeleton | `StaffScreen.tsx` invites staff by phone to the single active venue. | - Edit business name<br>- Multi-location manager: Locations list with "+ Add location"<br>- Add location flow: modal asking "Another location of this business" vs "A separate business", then details (name, address, city, postcode)<br>- Edit location: name, email, phone, address 1/2, city, postcode, country<br>- Global **Location Switcher** in header scoping all screens<br>- Team: invite by email/phone with roles (`owner`, `manager`, `viewer`, `staff-scanner`), list, revoke | - Add `Business` and `Location` entities<br>- Add multi-location switcher in `useOwnerSession`<br>- Expand staff roles and add `revokeStaff` endpoint | **M** |
| **12** | **Account & Settings** | `/owner/settings`<br>`/owner/devices` | 🟡 Skeleton | Launcher tiles in `MoreScreen.tsx`. No dedicated account management. | - Account / Settings screen: Profile (email/phone, role badge, assigned locations), QR shortcut, language switcher, contact us, report a bug, sign out<br>- Danger Zone: Delete account with type-to-confirm dialog<br>- Scanner Devices manager: pair device with short-lived 6-digit code (10 min TTL) or staff login; list paired devices with last seen and revoke action<br>- Dedicated staff "Scanner Mode" isolating camera and card confirmation | - Add `ScannerDevice` schema and endpoints (`listDevices`, `createPairingCode`, `revokeDevice`)<br>- Add `deleteAccount` endpoint in auth<br>- Add scanner mode state in session store | **M** |

---

## 5. Audit of Dead Buttons, Placeholders, 404s & Theme Inconsistencies

### A. Dead Buttons & Disconnected Handlers
1. **`productShells.tsx` (POS Shell):**
   - "Take Cash" and "Prompt MoMo" buttons only call local `setPaid(true)` and do not write to the backend or update orders/transactions.
2. **`productShells.tsx` (Stock Shell):**
   - Inventory items are static mocks; no toggle or stock adjustment action exists.
3. **`productShells.tsx` (AI Shell):**
   - Language selector switches static local mock strings; chat textarea does not send prompts.
4. **`productShells.tsx` (Marketing Shell):**
   - "Active Opt-In Audience" is static text; no broadcast SMS action.
5. **`DashboardScreen.tsx` Alerts:**
   - Alert banners (e.g. payout pending, open calls) display text but clicking them does nothing. They should link directly to `/owner/setup` (payout) or `/owner/calls`.
6. **`DashboardScreen.tsx` Stat Tiles:**
   - "Orders", "Avg order", "Reviews" tiles are plain non-interactive cards without drilldowns.
7. **`MoreScreen.tsx` Shell Tiles:**
   - Navigates to placeholder shell screens with "COMING IN PHASE 3" badges.
8. **`BrandingScreen.tsx` Image Crop:**
   - Cover and logo upload triggers mock media upload slot but lacks interactive crop adjustment.

### B. Placeholder Copy & Hardcoded Strings
1. **`DashboardScreen.tsx` Line 71:** Falls back to hardcoded string `"Mama's Kitchen"` if venue query is pending.
2. **`DashboardScreen.tsx` Line 55:** Hardcoded `248000` fallback pesewas for average order calculation.
3. **`DashboardScreen.tsx` Line 161:** Uses hardcoded ternary `order.tableCode ? 'MoMo' : 'Cash'` instead of true payment method.
4. **`BrandingScreen.tsx` Line 70:** Hardcoded fallback `"African kitchen and grill."`.
5. **`SetupScreen.tsx` Line 33:** Hardcoded table codes `'1, 2, 3'`.
6. **`TablesScreen.tsx` Line 69:** Hardcoded stat card value `"Ready"`.

### C. Missing Routes / 404 Risks
Currently, all `router.push` calls navigate to registered files in `src/app/owner/`. However, the following required target routes are currently **missing** (would 404 if linked):
- `/owner/feedback` (Feedback inbox)
- `/owner/feedback/ai` (Ask Ozaa feedback assistant)
- `/owner/loyalty/pass` (Rewards pass editor)
- `/owner/loyalty/stamp-card` (Stamp card setup)
- `/owner/loyalty/customers` (Enrolled customer list)
- `/owner/loyalty/analytics` (Loyalty analytics charts)
- `/owner/loyalty/scan` (Camera scan & stamp screen)
- `/owner/socials` (Google review link & social profiles)
- `/owner/links` (Custom links manager)
- `/owner/business` (Business & multi-location manager)
- `/owner/settings` (Account, profile & danger zone)
- `/owner/devices` (Scanner devices pairing & scanner mode)

### D. Theme & Style Inconsistencies
1. **Raw Tailwind / Hex Colors in StyleSheets:**
   - `CodeTile.tsx` & `IconTile.tsx`: Hardcoded `#FEF2F2` for alert tone.
   - `Field.tsx`: Hardcoded `#FFFFFF` background.
   - `StatusPill.tsx`: Hardcoded `#ECFDF3` and `#FEF2F2`.
   - `BrandingScreen.tsx`: Hardcoded `#F4F4F5`, `#A1A1AA`, `#71717A`, `#16A34A`, `#B45309`, `#4B5563`, `#F3F4F6`, `#E5E7EB`, `#374151`, `#F0FDF4`, `#BBF7D0`, `#FEF3C7`, `#FDE68A`.
   - `StaffScreen.tsx`: Hardcoded `#4B5563`, `#DC2626`, `#F3F4F6`, `#E5E7EB`, `#F9FAFB`, `#374151`, `#FEF2F2`, `#FCA5A5`.
   - `TablesScreen.tsx`: Hardcoded `#FFF8F5`, `#F0F0F0`, `#F5F5F5`, `#888888`, `#EFEFEF`, `#444444`, `#999999`.
   - `OwnerLogin.tsx`: Hardcoded `#9CA3AF`, `#DC2626`, `#6B7280`, `#E5E7EB`, `#F3F4F6`, `#374151`, `#FAFAFA`, `#888888`, `#4B5563`, `#D1D5DB`, `#FEF2F2`, `#FCA5A5`.
   - **Correction needed:** All UI elements must strictly consume semantic colors from `tokens.color` or `useTheme()` (`theme.white`, `theme.line`, `theme.wash`, `theme.text`, `theme.muted`, `theme.meta`, `theme.fill`, `theme.tint`, `theme.error`, `theme.success`).
2. **Spacing Inconsistencies:**
   - Mixed use of arbitrary numbers (`gap: 2`, `gap: 14`, `padding: 20`, `paddingBottom: 6`) instead of `tokens.space[1..16]` (`4, 8, 12, 16, 20, 24, 32, 40, 48, 64`).
3. **Typography Inconsistencies:**
   - Direct inline font weight definitions (`fontWeight: '700'`, `fontWeight: '600'`) mixed with `Text` variants instead of relying on tokenized variants (`display-l`, `display-m`, `title`, `body`, `body-strong`, `caption`, `button`).

---

## 6. Proposed Navigation Architecture

### Current Mobile Nav (5 Tabs)
Currently, `phoneNav()` in `nav.ts` renders:
1. `Dashboard` (`/owner`)
2. `Floor` (`/owner/floor`)
3. `Orders` (`/owner/orders`)
4. `Calls` (`/owner/calls`)
5. `More` (`/owner/more`)

*Problem:* The current 5 tabs are oriented solely around floor waitstaff/kitchen operations. Key owner/manager features—**Menu Builder, Loyalty Hub, Feedback Inbox, and Analytics**—are buried in a generic grid list under "More".

### Recommended Navigation Restructure

#### A. Global App Header (All Screens)
- **Left:** Location Switcher Dropdown (e.g. `📍 Mama's Kitchen — Osu ▾`). Tapping opens a quick sheet to switch locations or add a new location.
- **Right:** Quick Action shortcuts:
  - 🔔 Waiter Calls Badge (shows count of active requests)
  - 📱 QR & Live Diner Preview sheet trigger

#### B. Primary Mobile Bottom Tabs (5 Tabs)
1. **Home / Analytics** (`/owner`): Sales KPIs, cards enrolled, active diners, scans/views, feedback sentiment summary chart, and quick operational alerts.
2. **Menu** (`/owner/menu`): Full menu builder, category schedules, dish descriptions, photos, allergens, modifier groups, and 86 availability switches.
3. **Loyalty** (`/owner/loyalty`): Hub (Rewards pass + Stamp card), enrolled customers list, analytics charts, and camera scan & stamp trigger.
4. **Feedback** (`/owner/feedback`): Suggestion box inbox, sentiment chips, anonymity visibility delay, search, archive, and "Ask Ozaa" AI assistant.
5. **More** (`/owner/more`): Clean grouped hub containing:
   - **Live Floor Operations:** Live Floor Map (`/owner/floor`), Kitchen Orders (`/owner/orders`), Waiter Calls Queue (`/owner/calls`), Payments & Cashier (`/owner/payments`).
   - **Guest Page & Extras:** Venue Page Design (`/owner/branding`), Google Reviews & Socials (`/owner/socials`), Wi-Fi & Table Services (`/owner/services`), Custom Links (`/owner/links`), Table QR & Print Cards (`/owner/tables`).
   - **Management:** Business & Locations (`/owner/business`), Team & Permissions (`/owner/staff`), Scanner Devices (`/owner/devices`), Account & Settings (`/owner/settings`).

#### C. Wide Screen Desktop / Tablet Sidebar (≥840px)
Organized into clear semantic sections:
- **Header:** Ozaa Wordmark + Location Switcher
- **MY VENUE PAGE:**
  - 🎨 Design & Branding (`/owner/branding`)
  - 🎁 Loyalty Program (`/owner/loyalty`)
  - ⭐ Reviews & Social Links (`/owner/socials`)
  - 📖 Menu Builder (`/owner/menu`)
  - 💬 Suggestion Box (`/owner/feedback`)
  - 📶 Wi-Fi & Services (`/owner/services`)
  - 🔗 Custom Links (`/owner/links`)
  - 🪑 Table QR Codes (`/owner/tables`)
- **OPERATIONS:**
  - 📊 Overview & Analytics (`/owner`)
  - 🗺️ Live Floor (`/owner/floor`)
  - 📋 Kitchen Orders (`/owner/orders`)
  - 🔔 Waiter Calls (`/owner/calls`)
  - 💳 Payments & Payouts (`/owner/payments`)
- **BOTTOM MANAGEMENT:**
  - 🏢 Business & Locations (`/owner/business`)
  - 👥 Team Members (`/owner/staff`)
  - 📱 Scanner Devices (`/owner/devices`)
  - ⚙️ Account & Settings (`/owner/settings`)
  - 🚪 Sign Out

---

## 7. Data Layer & OpenAPI Contract Migration Plan

All API changes will be backwards-compatible additions to `api/openapi.yaml`, followed by type generation (`src/lib/api/schema.ts`) and mock updates (`src/mocks/`):

1. **Feedback Module:**
   - Add schema `FeedbackItem` (`id`, `venueId`, `sentiment`, `score`, `text`, `photoUrl`, `contactPhone`, `contactName`, `archived`, `visibleAfter`, `createdAt`).
   - Add `GET /owner/venues/{venueId}/feedback` (with query filters `state: 'new' | 'archived'`, `search: string`).
   - Add `PATCH /owner/venues/{venueId}/feedback/{feedbackId}/archive` (`archived: boolean`).
   - Add `POST /owner/venues/{venueId}/feedback/ask` (`question: string`).
2. **Venue Page Design & Socials:**
   - Extend `VenueSettings`: add `tagline`, `buttonTint` (`auto | light | dark`), `stylePreset` (`default | classic | editorial | modern`), `buttonOrder` (`string[]`).
   - Add `socials` object in `VenueSettings`: `googleReviewUrl`, `googleReviewMinStars`, `instagram`, `facebook`, `tiktok`, `tripadvisor`, `whatsapp`, `x`, `youtube`, `phone`, `email`, `website`, with `enabled` flags.
3. **Menu Builder:**
   - Extend `MenuCategoryInput` / `MenuCategory`: add `sortOrder: integer`, `schedule?: { days: integer[], startTime: string, endTime: string }`, `hidden: boolean`.
   - Extend `MenuItemInput` / `MenuItem`: add `description: LocalizedText`, `photoUrl?: string`, `allergens: string[]`, `calories?: integer`.
   - Add `ModifierGroup` and `ModifierOption` schemas; attach `modifierGroups: ModifierGroup[]` to `MenuItem`.
   - Add multi-menu collections support (`GET/POST /owner/venues/{venueId}/menus`).
4. **Loyalty Program:**
   - Extend `LoyaltyProgram`: add `programKind: 'rewards_pass' | 'stamp_card' | 'both'`, `stampCard: { reward: string, stampsRequired: number, secondTierReward?: string, secondTierStamps?: number, cooldown: 'none' | '1h' | '4h' | '1d', appearance: { bgHex: string, textHex: string, coverUrl?: string, logoUrl?: string }, lockscreenMessage?: string }`.
   - Add `rewardsPass: { appearance: { bgHex: string, textHex: string, coverUrl?: string, logoUrl?: string }, lockscreenMessage?: string, automations: { welcome: string, birthday: string, winbackDays: number, winbackReward: string, reviewAskReward: string } }`.
   - Add `GET /owner/venues/{venueId}/loyalty/customers` (search, `wantsOffers` filter, export).
   - Add `GET /owner/venues/{venueId}/loyalty/analytics` (range `7d | 30d | 90d`).
   - Add `POST /owner/venues/{venueId}/loyalty/scan` (`qrPayload: string`).
5. **Wi-Fi & Custom Links:**
   - Update `Wifi`: `security: 'WPA' | 'WPA2' | 'WPA3' | 'WEP' | 'OPEN'`, `hidden: boolean`.
   - Add `CustomLink` schema and CRUD endpoints (`GET/POST /owner/venues/{venueId}/links`, `PATCH/DELETE /owner/venues/{venueId}/links/{linkId}`).
6. **Business, Locations & Scanner Devices:**
   - Add `Business` and `Location` schemas. Add `GET/POST /owner/businesses` and `GET/POST /owner/businesses/{id}/locations`.
   - Add `ScannerDevice` schema and endpoints (`GET /owner/venues/{venueId}/devices`, `POST /owner/venues/{venueId}/devices/pair`, `DELETE /owner/venues/{venueId}/devices/{deviceId}`).

---

## 8. Web Landing Page Audit & Alignment Plan

### Current Landing Structure (`landing/src/`)
- Hero -> How It Works -> Guests Experience -> Owners Overview -> Payments -> Pricing -> Questions / FAQ -> Contact -> Footer.

### Target Landing Page Section Order & Specifications
Per the project requirements, the landing page will match this exact 13-section sequence:
1. **Sticky Top Nav:** Brand logo ("Ozaa"), Links: Features, Pricing, FAQ, Sign In, Primary CTA ("Start free"). Mobile slide-out drawer.
2. **Hero Section:** One-line promise (independents turning walk-ins into regulars in Ghana), punchy subline, 2 CTAs ("Start free" + "Book demo"), and latest iPhone mockup displaying the table landing page.
3. **Demo Video & 3 Check Bullets:** "Menus, rewards, Wi-Fi and feedback from one tap at the table" with interactive preview video frame and 3 bullet highlights (Instant photo menu, Apple/Google wallet rewards, Google reviews).
4. **Interactive "Try It" Live Preview:** Diner can type their restaurant name or cuisine, choose a brand colour, and immediately preview their generated mobile table page.
5. **"One Tag Replaces" Strip:** Clean graphic strip demonstrating how a single table QR code replaces bulky paper menus, punch cards, Wi-Fi password slips, and paper receipt surveys.
6. **Three Pain-Point Questions:** Rhetorical independent owner questions ("Can you reach last week's customers?", "Do you hear about bad food before it ends up on Google?", "How many walk-ins come back?").
7. **Alternating Feature Deep-Dives:**
   - *Feature 1 — Menus:* Digital ordering, instant 86 sold-out items, modifier options, allergen tags.
   - *Feature 2 — Loyalty:* Apple/Google Wallet stamp card, lock-screen proximity alerts, automated win-back SMS.
   - *Feature 3 — Feedback & Reviews:* Private suggestion box for negative notes, automatic 5-star Google Review routing.
   - *Feature 4 — Wi-Fi & Services:* 1-tap camera Wi-Fi join, waiter calls, custom links, wait-time game.
8. **Three Easy Steps (01–03):** 1. Create your menu & brand (2 mins), 2. Place table cards, 3. Guests tap and order.
9. **Transparent Pricing:** Clear plans (Starter vs Pro) with Monthly vs Annual toggle (annual discount), Ghanaian Cedi (`GH₵`) pricing, feature comparison list, "No card required" free trial badge.
10. **FAQ Accordion:** Expandable questions addressing QR ordering, offline support, MoMo payments, fee structure, and printer hardware.
11. **Closing CTA Band:** Full-width high-contrast card: "One tap. Everything that matters." with primary CTA button and WhatsApp chat link.
12. **Footer:** Brand mark, Ghana law compliance (Act 843 Data Protection), terms of service, privacy policy, social links, copyright.
13. **Modals & Overlays:**
    - "Book a Demo / Early Access" lead capture modal with validation.
    - Act 843 compliant Cookie / Privacy consent banner (Accept / Decline).

---

## 9. Next Steps & Approval Gate

Per instructions, **Phase 0 is complete with this audit**. No feature code will be written until this gap table, the proposed 5-tab + location switcher navigation, and the data migration plan are reviewed and approved by Clarke.
