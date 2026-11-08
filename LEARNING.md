# Learning Cravins

Plain-language notes for Clarke. Newest at the top.

---

## 2026-11-03 · A hygiene pass: what the app remembers, and when

**What we built**

No new features. We fixed bugs that were hard to see: a crashed page now shows "This page stopped working" with Try again. A waiter who signs in on the owner's tablet no longer sees the owner's customers. A dish from one restaurant can't end up in another's order.

**How it works**

The app keeps a cache: answers from the server it may need again.

```
server answer → cache (memory) → only venue + menu → saved on the device
sign out      → every key starting "owner-" is removed from the cache
```

Every cache entry has a key, like `['menu', 'mamas-kitchen']`. Keys are now built in one place, so a typo can't stop a screen refreshing.

**Files to look at**

- `src/lib/queryKeys.ts` and `src/features/owner/data/keys.ts`: every cache key
- `src/lib/queryPersist.ts`: what may be saved, and what sign-out clears
- `src/ui/AppErrorBoundary.tsx`: the crash screen
- `docs/refactor-audit.md`: everything found, and what still needs your decision

**New idea: a cache key**

A cache is like a pigeonhole rack at reception. The key is the label on the hole. If one screen files the menu under "menu" and another looks under "Menu", the second finds nothing and shows old data. One label maker for everyone fixes that.

**Try it yourself**

In `src/lib/queryPersist.ts`, add `'wifi'` to `PERSISTED_ROOTS` and run `npm test`. The tests still pass, because they only check owner data. Then open the Wi-Fi page and look in your browser's Local Storage for `REACT_QUERY_OFFLINE_CACHE`. The Wi-Fi password is now saved on the phone. That's why the list is short. Put it back when you're done.

---

## 2026-11-03 · Switching payments off with a feature flag

**What we built**

This build has no payments. Guests order, then pay at the counter or ask for the bill. Owners see orders, tables and calls with no money screens. All the payment code still exists.

**How it works**

```
app.config.ts  PAYMENTS_ENABLED=false  →  src/lib/features.ts  →  each screen checks PAYMENTS_ENABLED
```

Without payments, nothing marks a meal paid, so the bill request takes over:

```
guest asks for the bill → table shows "Waiting for the bill" → staff tap "Bill settled" → table is free
```

**Files to look at**

- `src/lib/features.ts`: the one place the flag is read.
- `src/features/owner/floor/floorStatus.ts`: table status with and without payments.
- `src/features/owner/desk/daySummary.ts`: the bills alert comes from bill requests when payments are off.
- `docs/payments-removed.md`: what's hidden, what's deleted, and how to bring it back.

**New idea: a feature flag**

A feature flag is a switch in the config that turns a feature on or off without deleting its code. Here, payments are off, but the Pay screen is still in the app, waiting. Flipping the switch brings it back. The full original version is also saved on the `feature/payments-v1` branch.

**Try it yourself**

Run `PAYMENTS_ENABLED=true npx expo start --web --clear` and open a table page. The "Pay & split bill" tile comes back. Run it again without the flag and it's gone.

---

## 2026-11-02 · Making the guest page download less

**What we built**
The guest's first visit downloads about half as much JavaScript as before (1,034 KB down to about 560 KB), and the page no longer waits for fonts.

**How it works**

```
before: entry + one big "__common" file (every page's shared code, owner screens included)
after:  entry + small "__shared" files, each holding only what that page needs
        + tree shaking: unused exports (1,500 unused icons) are dropped at build time
fonts:  show text in the system font at once, swap to Inter when it arrives
```

**Files to look at**

- `.env.production`: the two build flags that turn on tree shaking
- `app.config.ts`: `experiments.chunking.mode: 'granular'`
- `src/theme/fonts.ts`: `FontDisplay.SWAP` on the web
- `src/ui/GestureRoot.web.tsx`: a `.web.tsx` file replaces its twin on the web only

**New idea: tree shaking**
`import { Bell } from 'lucide-react-native'` looks like it takes one icon, but by default the bundler packs the whole library. Tree shaking follows which exports are really used and shakes the rest off, like dead leaves.

**Try it yourself**
Run `npx expo export -p web`, then sort `dist/_expo/static/js/web` by size. Comment out the two lines in `.env.production`, export again, and compare.

---

## 2026-11-02 · Slow networks: offline note, quiet polling, lighter menu

**What we built**
When a guest loses signal, the home and menu screens keep showing the saved menu with a quiet line: "You're offline. Showing what we saved 3 minutes ago." On a phone, the app stops checking the server while it sits in a pocket. The menu list got cheaper to redraw.

**How it works**

```
signal drops → React Query's onlineManager flips to offline → <OfflineNote> appears
app to background → AppState "background" → focusManager pauses polling
tap "+" on a dish → only <MenuCartBar> re-renders (it reads the cart), not every dish card
```

**Files to look at**

- `src/ui/OfflineNote.tsx`: the offline line and the `useOnline()` hook
- `src/lib/queryLifecycle.ts`: pausing polling in the background
- `src/features/menu/MenuCartBar.tsx`: the bar that owns the cart subscription
- `src/features/menu/MenuScreen.tsx`: the menu on FlashList

**New idea: who subscribes decides who re-renders**
A component re-renders when data it _reads_ changes. The menu screen used to read the cart, so adding one dish redrew every card. Moving that read into the small bar means only the bar redraws. On a cheap phone that is the difference between smooth and stuttery.

**Try it yourself**
Open the menu in Chrome, open DevTools → Network, and switch "No throttling" to "Offline". Watch the note appear while the dishes stay. Switch back and it disappears.

---

## 2026-11-02 · Owner app: dark mode, real navigation and honest numbers

**What we built**
The owner app now follows the phone's light or dark setting, has a proper back button on every inner screen, and only shows numbers the server actually sent. The menu builder can reorder sections and add dish photos, and the Tables screen can share and download QR codes.

**How it works**

```
phone setting (light/dark) → owner layout picks a theme → every screen reads colours by role
                                                         (bg, surface, text, ink, error…)
tab tap → clear the stack → open that tab's root      (no back button)
row tap → push a screen on top                       (back button + swipe back)
```

**Files to look at**

- `src/theme/palette.ts`: the light and dark colours, with contrast checked in `palette.test.ts`
- `src/ui/makeStyles.ts`: styles that change with the theme
- `src/features/owner/chrome/nav.ts`: which tabs each role gets, and what goes in More
- `src/features/owner/desk/dashboardModel.ts`: turns server numbers into the dashboard, never inventing any
- `src/features/owner/screens/menu/reorder.ts`: moving a menu section up or down

**New idea: colours by role, not by value**
Before, screens said "make this `#FFFFFF`". In dark mode that stays white and glares. Now screens say "make this the _surface_" and the theme decides what surface means: white in light mode, near-black in dark mode. One file changes; every screen follows.

**Try it yourself**
Open `src/theme/palette.ts` and change dark `surface` to `'#2A2A2E'`. Run `npm test`: the contrast test tells you if any text got too hard to read. Then switch your phone to dark mode and open Today.

---

## 2026-11-01 · Completing the full owner suite and 13-section web landing page

**What we built**

We brought the entire Cravins owner side and marketing landing page to production completeness:

1. **Menu Builder & Table Print**: Custom category schedules, 14 standard allergen tags, modifier choices, sequential table codes, and printable vector table tent cards.
2. **Venue Design & Reviews**: Star gating (4–5★ to Google, 1–3★ to private feedback), custom links with scheduling, Wi-Fi QR connect strings, and brand customizer.
3. **Loyalty Hub & Camera Scanner**: Digital stamp cards with anti-fraud cooldown timers, customer roster with Act 843 filters, camera reticle scanner, and paired handheld devices.
4. **Feedback Inbox & AI**: Private guest inbox with anonymity delays, sentiment badges, and conversational "Ask Cravins" feedback assistant.
5. **Business & Multi-Location**: Multi-branch manager, global location switcher scoping all screens, team roles (Manager, Waiter, Kitchen, Viewer, Scanner), and Act 843 typed account deletion.
6. **13-Section Web Landing Page**: Sticky nav, hero with iPhone 16 Pro mockup, interactive live try-it preview, replaces strip, pain points, alternating feature deep dives, pricing with monthly/annual toggle, FAQ accordion, CTA band, and lead demo modal.

**How it works**

```
Diner QR scan / Camera → In-memory / HTTP API → Scoped by active venueId in Zustand → Reactive Query Cache
```

When an owner switches branch locations in the header chip, the active `venueId` updates across Zustand. Every screen automatically refetches for that specific branch.

**Files to look at**

- `src/features/owner/screens/`: all polished screen implementations.
- `src/features/owner/chrome/OwnerChrome.tsx`: location switcher and sidebar.
- `landing/src/pages/index.astro`: the 13-section landing page.

**New idea: Global location scoping**

Instead of passing the active venue ID manually down to every button and query, keeping `venueId` in a reactive state store (`useOwnerSession`) lets any screen switch branches without restarting the app or getting stale data.

**Try it yourself**

Open `http://localhost:4321/` in your browser to test the interactive preview on the landing page. Then open `http://localhost:8081/owner` and tap the location switcher in the top bar to switch between Mama's Kitchen and Airport City!

---

## 2026-10-31 · Owner app redesign: design kit and full feature layouts

**What we built**

A complete overhaul of the Cravins Owner App from bare text rows into a high-fidelity, polished management dashboard across all 15 screens. We created a shared owner kit (`DeskCard`, `StatTile`, `BigStat`, `StatusPill`, `Toggle`, `DeskTabs`, `IconTile`, `CodeTile`, `ChipRow`) matching Cravins brand tokens.

Every screen now has full features:

- **Dashboard**: Today's sales Unbounded headline, 3 metric cards, quick actions, and live order items with table code tiles.
- **Floor**: Responsive table layout grid, derived status pills, and interactive table bill sheet with cash payment marking.
- **Orders (Kitchen)**: Status tabs, ticket cards with checklists, elapsed timers, and "Start preparing" / "Mark ready" actions.
- **Calls**: Waiter call queue with caller table badge, reason pills, elapsed wait times, and resolve buttons.
- **Menu**: Food & Drinks tabs, dietary chips, available/sold-out toggles, and new dish creator.
- **Services**: Grouped toggles (`AT YOUR TABLE`, `REWARDS`, `FUN WHILE YOU WAIT`), game score stepper, and Wi-Fi credentials.
- **Reviews**: Video moderation queue with video thumbnails, star ratings, story featuring, and written review private replies.
- **Payments**: Payout account verification, transaction list with MoMo/Card/Cash filter chips, and instant refunds.
- **Tables & QR**: Table tent card / sticker visualizer with Cravins logo, print action, and batch table creator.
- **Branding**: Live phone preview, palette presets, live WCAG contrast checker, and photo uploads.
- **Staff**: Team member cards, role tags, and phone-based invites.
- **Insights**: Range tabs, sales bar chart, top selling items, and peak service hours.
- **Setup**: 4-step onboarding wizard with progress tracker.
- **Prototypes**: Interactive prototypes for POS register, Stock inventory with auto-86, Multilingual AI waiter, and Marketing broadcast.

**How it works**

```
Cravins Tokens (tokens.json) → Owner Kit (DeskCard, StatTile, StatusPill...) → 15 High-Fidelity Owner Screens
```

All owner screens adhere strictly to the Cravins brand rules: clean white cards, black text, Unbounded for big money numbers, and `#D24000` orange strictly on buttons, active icons, and small status words.

**Files to look at**

- `src/features/owner/kit/`: the reusable owner UI parts.
- `src/features/owner/screens/`: the 15 screen components.
- `e2e/owner.spec.ts`: Playwright test suite capturing screenshots at 390×844 and 1024×768.

**New idea: Design system kits**

Instead of styling every screen individually with different borders, paddings, and font sizes, creating a shared "Kit" ensures that every screen in the app looks like it came from the exact same designer. When a color or radius changes, updating the kit updates the entire app at once.

**Try it yourself**

Open `http://localhost:8081/owner` in your browser (or scan the Expo Go tunnel QR). Sign in with `0240000001` and code `123456`, and explore the Dashboard, Floor, Kitchen tickets, Table QR tent cards, and Brand Customiser.

---

## 2026-10-31 · The owner app (BUILD.md section 18)

**What we built**

The venue side of Cravins. After a phone code, the owner sees today's money, the floor, kitchen tickets, waiter calls, the menu, loyalty, and the rest of the tools. On a phone the links sit on the bottom. On a tablet they sit in a sidebar.

**How it works**

The floor does not store a status on the table. It looks at the orders and the waiter calls and decides.

```
orders + waiter calls → deriveFloor → free, seated, ordered, waiting to pay, or needs a waiter
```

A call wins over everything else, because someone is waiting. When the kitchen marks an order ready, the guest's phone shows "Your food is ready!" on whatever screen they are on, including the game. Only that one status does it.

**Files to look at**

- `src/features/owner/floor/floorStatus.ts`: the table status rules, with no React in the file.
- `src/features/owner/chrome/nav.ts`: which role sees which screen.
- `src/app/owner/_layout.tsx`: the sidebar and the sign-in check.

**New idea: a derived status**

A state machine lists the moves a thing can make, like a ticket going from received to preparing. The floor is different. Its status is worked out from other facts. If you stored "free" and "has an order" as two flags, they could disagree. Deriving the word from the orders means they cannot.

**Try it yourself**

In `floorStatus.ts`, make a resolved waiter call keep the table on "needs a waiter". Run `npx jest src/features/owner/floor/floorStatus.test.ts` and read the failure. Put the rule back so the test passes.

---

## 2026-10-31 · Loyalty wallet card, points, tiers, and staff redemption

**What we built**

A venue-branded wallet card (`WalletCard.tsx`) with the Cravins scan-frame watermark, Bronze/Silver/Gold tiers, stamps or spend points, a rewards catalogue, and an owner Loyalty screen (`OwnerLoyalty.tsx`) to set up the programme and confirm guest claim codes.

**How it works**

```
paid order or game win → earn fact added → fold calculates balance & lifetime tier
guest taps Get claim code → 6-char claim hold → staff enters code → confirm fact debits balance
```

We never store a separate `stamps` counter that could drift out of sync with history. Instead, every card stores an append-only list of facts (`earn`, `claim`, `confirm`), and `foldCard` calculates the available balance and lifetime tier from those facts. Showing a claim code only places a temporary hold; a reward is spent only when staff confirm the code.

**Files to look at**

- `src/features/loyalty/facts.ts`: the pure ledger commands (`apply`) and `foldCard`.
- `src/features/loyalty/WalletCard.tsx`: the venue-coloured wallet card with front/back QR flip.
- `src/features/loyalty/LoyaltyDetails.tsx`: rewards catalogue, claim banner, tier row, and activity history.
- `src/features/owner/OwnerLoyalty.tsx`: staff code confirmation, programme setup, and members list.

**New idea: folding a ledger of facts**

If you store both a `stamps: 5` number and a history list, a bug can update one and forget the other. When you calculate `available` and `lifetime` by summing the history list every time (`foldCard`), the balance and history can never disagree.

**Try it yourself**

Open `/mamas-kitchen/loyalty`, tap "Get claim code" on a reward, copy the 6-character code, then open `/owner/loyalty` and confirm that code. Watch Ama's balance drop and the redemption appear in the owner log.

---

## 2026-10-31 · Dietary filters on the menu

**What we built**

The "Show only" chips are gone from the menu header. A filter icon sits next to search. It opens a sheet where a guest can pick more than one diet, then Apply or Clear. A small orange number appears on the icon while filters are on. If nothing matches, the list says so.

**How it works**

```
tap filter → tick Vegetarian and Gluten free → Apply → only dishes with both tags
```

Clear removes every tick and closes the sheet. Closing the sheet without Apply leaves the menu as it was.

**Files to look at**

- `src/features/menu/MenuScreen.tsx`: the icon, the badge, and the empty line.
- `src/features/menu/DietFilterSheet.tsx`: the sheet.
- `src/features/menu/filterMenu.ts`: an item must have every selected tag.

**Try it yourself**

Open Mama's Kitchen menu, apply Vegetarian, and read the empty line. The sample dishes have no diet tags yet, so the list goes empty. Clear brings the dishes back.

---

## 2026-10-31 · Languages, money and phone numbers

**What we built**

The language list is now a global one: English, French, Portuguese, Spanish, Arabic and Swahili. Only English can be selected. The others say "Coming soon". Prices and phone numbers follow the venue. Ghana is still the sample, so Mama's Kitchen shows cedis and `+233`.

**How it works**

```
venue currency + minor units → formatMoney → GH₵65 in Accra, ₦65 if the currency is NGN
guest types a phone → parsePhone(text, country) → +233… in Ghana, +234… in Nigeria
```

Arabic is set up to run right to left when it becomes selectable. The empty language files are waiting for a person who speaks that language. We do not machine-translate them.

**Files to look at**

- `src/features/venue/languages.ts`: the list, and which rows are ready.
- `src/lib/money.ts`: `formatMoney`. 6500 minor units is GH₵65 for the Ghana sample.
- `src/lib/phone.ts`: the country is an argument. Ghana is the default.

**New idea: a default sample**

The app is global, and the first screens still use Accra data. The formatter does not contain the letters "GH₵" as a fixed string. Intl prints that symbol because the currency is `GHS`.

**Try it yourself**

Open Mama's Kitchen, tap Language, and see French and Arabic marked Coming soon. Tapping them leaves the app in English.

---

## 2026-10-31 · How the app is put together (BUILD.md Phase 0)

**What we built**

The phone and web app shell. It loads the fonts, the Cravins colours, and a fake server so we can click through Mama's Kitchen before a real server exists.

**How it works**

A guest opens a URL like `/mamas-kitchen/t/12`. That route asks the API for a guest session, stores a short-lived token in memory, and shows the venue home.

```
QR link → guest session → venue home → menu, waiter, pay, and the rest
```

Every screen asks one object, `api`, for data. Today `api` is the mock, filled from `api/fixtures`. Later the same screens can talk to the real server by changing one environment variable.

**Files to look at**

- `src/app/[venue]/index.tsx`: the route. It only reads the venue name from the URL and shows `HomeScreen`.
- `src/features/theming/deriveTheme.ts`: turns one venue colour into button, icon, and badge colours that stay readable.
- `src/lib/money.ts`: prices are whole minor units. In the Ghana sample, `GH₵65` is `6500` pesewas. `formatMoney` takes the venue currency.
- `src/mocks/mockClient.ts`: the stand-in server.

**New idea: a boundary**

The fixture files are just JSON. We check them at the edge, then the rest of the app trusts the types. You do not re-check "is this a number?" in the middle of a screen.

**Try it yourself**

Change Mama's Kitchen's accent in `api/fixtures/venues.json` from `#B5432A` to `#1F5C3F`, run `npm run copy:fixtures`, and reload `/mamas-kitchen`. The buttons should go green. Put the brick colour back when you are done.

---

## 2026-10-31 · Money, stamps, and payment steps

**What we built**

The rules for a bill, a stamp card, and the steps a payment can be in. The screens read those rules. They do not invent a new total.

**How it works**

```
guest picks split and tip → quoteBill → Paystack (later) → only "succeeded" marks the order paid
```

An equal split gives leftover pesewas to the first people who pay. A tip percent rounds half-up to the pesewa. A countdown ending does not mean the payment failed. The app keeps checking until the server answers.

**Files to look at**

- `src/features/pay/quoteBill.ts`: the bill maths.
- `src/features/pay/paymentMachine.ts`: the steps on the guest's screen.
- `src/features/loyalty/loyaltyRules.ts`: one stamp per paid order, and one game stamp per day.
- `src/features/game/plateStack.ts`: the plate game, with no network.

**New idea: a state machine**

A payment is not a pile of yes/no flags. It is one step, and only some steps can follow it. "Choosing" can become "quoting". It cannot jump to "paid".

**Try it yourself**

In `src/features/pay/quoteBill.test.ts`, change the 3-way split example and run `npm test`. The first share should still be the one that carries the extra pesewa.

---

## 2026-11-03 · The owner sidebar in three groups

**What we built**

On a wide screen the owner sidebar now has three groups: Main, Sales and Settings. It shows your plan next to the Cravins name, and it can fold down to a thin strip of icons. Help, your profile and Sign out sit at the bottom. Pages that aren't built yet (Categories, Store notice, Promos, Integrations, Help) open a short "Coming soon" page.

**How it works**

```
nav.ts (one list of pages, each with a group and the roles allowed)
   ├─ navGroups(role) → Sidebar.tsx (wide screens)
   └─ moreGroups(role) → More screen (phones, minus the 4 tabs)
```

The plan badge reads `business.plan` from the API. The plan names and features come from `landing/src/content/pricing.ts`, the same file the website's pricing page uses, so the two can't disagree.

**Files to look at**

- `src/features/owner/chrome/nav.ts`: every owner page, its group and who can open it.
- `src/features/owner/chrome/Sidebar.tsx` and `SidebarFooter.tsx`: the sidebar and its bottom rows.
- `src/features/owner/chrome/useSignOut.ts`: sign out, shared by Settings and the sidebar.
- `src/features/owner/screens/billing/`: the Billing page and the plans.

**New idea: one source of truth**

The list of pages lives in one place. The sidebar, the phone tabs and the More screen all read from it. To move a page, you change one line, and all three update.

**Try it yourself**

In `nav.ts`, change `customers` from `group: 'sales'` to `group: 'main'`, run `npm test`, and see which test tells you.

---

## 2026-11-03 · "Complete your setup" on Today

**What we built**

A card on Today that lists six set-up steps, ticks off the ones you've done, and shows a % bar. Tap a step to go to the page that does it. The card goes away when every step is done. Only the owner sees it.

**How it works**

```
venue + menu + tables + staff (already cached by other screens)
   → useSetupChecklist → setupChecklist(facts) → { steps, percent, next } → SetupCard
```

`setupChecklist` is plain maths with no screen and no network: true/false facts in, a list out. That's why it can be tested in milliseconds.

**Files to look at**

- `src/features/owner/desk/setupChecklist.ts` and its test: the rules.
- `src/features/owner/data/useSetupChecklist.ts`: turns API data into facts.
- `src/features/owner/screens/dashboard/SetupCard.tsx`: the card.

**New idea: derived state**

We don't store "setup is 83% done" anywhere. We work it out each time from data we already have, so it can never be out of date.

**Try it yourself**

In `setupChecklist.test.ts`, add a test that a venue with 0 tables gets `next.id === 'tables'` when everything before it is done.

---

## 2026-11-03 · Orders tabs with counts, and calls on Orders

**What we built**

Orders now has six tabs, each with a number: New, Cooking, Ready, Served, Rejected and All. Waiter calls and bill requests that nobody has closed show at the top of Orders, so staff can answer a table without leaving the tickets.

**How it works**

```
orders → orderTabCounts → { new: 2, cooking: 2, ready: 1, served: 4, rejected: 0, all: 9 }
calls  → useWaiterCalls  → OpenCalls (Orders) and CallsScreen (Calls) share one hook
```

A "cancelled" order is shown to staff as "Rejected". The order's status in the API doesn't change.

**Files to look at**

- `src/features/owner/desk/ops.ts`: `orderTab`, `orderTabCounts`, `ORDER_VIEWS`.
- `src/features/owner/screens/calls/useWaiterCalls.ts`: load calls and update them.
- `src/features/owner/screens/orders/OpenCalls.tsx`: the strip on Orders.

**New idea: a `switch` with no `default`**

`orderTab` lists every status by name, with no catch-all. If someone adds a new status to the contract, TypeScript says this function no longer returns for every case, so nobody forgets to place it in a tab.

**Try it yourself**

In `ops.test.ts`, add a test with an empty list and check that every count is 0.

---

## 2026-11-03 · A chime for new orders and waiter calls

**What we built**

While the owner app is open, on any screen, a short two-note chime plays when a new order or a new waiter call comes in. Kitchen staff hear orders only. Settings has a switch to turn the sound off, and the phone remembers it.

**How it works**

```
every 5 s: orders + calls (same cache as the Orders and Calls screens)
   → arrivals(seen, ids) → how many ids we haven't seen before
   → more than 0, and sound is on → play the chime
```

The first load only fills `seen`, so opening the app doesn't ring for orders already waiting.

**Files to look at**

- `src/features/owner/desk/arrivals.ts`: what counts as new.
- `src/features/owner/data/useArrivalChime.ts`: polls, compares, plays.
- `src/features/owner/data/ownerPrefs.ts`: the saved on/off switch.
- `scripts/gen-chime.mjs`: makes the sound file from two sine waves. We own it; nothing was downloaded.

**New idea: a hook test with fakes**

`useArrivalChime.test.tsx` swaps the real speaker and API for fakes (`jest.mock`), pushes a new order into the cache, and checks that `play` was called once. We test the behaviour without making any noise.

**Try it yourself**

In `gen-chime.mjs`, change `880.0` to `784.0` and run `node scripts/gen-chime.mjs`. The second note is now lower. Listen to `assets/sounds/new-order.wav`.

---

## 2026-11-03 · Categories on their own page

**What we built**

Categories (we call them sections in the code) now have their own page in the sidebar, with Food and Drinks shown apart. You can add, rename, hide, move and delete sections there. The Sections sheet on the Menu screen still works the same.

**How it works**

```
SectionsList (the rows and the New section button)
   ├─ SectionsSheet   → a pop-up on the Menu screen
   └─ CategoriesScreen → a full page, once for Food and once for Drinks
```

Both use `useMenuDesk`, so a change on one shows on the other straight away.

**Files to look at**

- `src/features/owner/screens/menu/SectionsList.tsx`: the shared list.
- `src/features/owner/screens/menu/CategoriesScreen.tsx`: the page.

**New idea: lift the shared part out**

When two screens need the same thing, we move it into its own component and pass in what changes (here, the list of sections and what each button does). The two screens can't drift apart.

**Try it yourself**

Add a section called "Desserts" on the Categories page, then open Menu → Sections. It's already there.

---

## 2026-11-03 · Your menu link, next to the table QR codes

**What we built**

The "QR codes and links" page now starts with your menu link (`https://cravins.app/<your-slug>`) and buttons to copy it, share it, or download it as a QR code. Under that is a short piece of code you can paste into your own website to show the menu there. The table QR codes are below, as before.

**How it works**

```
site address (EXPO_PUBLIC_SITE_URL) + venue slug → menuLink → copy / share / QR
menuLink + venue name → embedSnippet → <iframe …> for the venue's website
```

The menu link is different from a table QR code: a table code tells us which table the guest sits at, and the menu link doesn't. Ordering from the link (pickup and delivery) comes in 4b.15.

**Files to look at**

- `src/features/owner/desk/menuLink.ts` and its test.
- `src/features/owner/screens/tables/MenuLinkCard.tsx`: the card.
- `src/features/owner/screens/tables/IconAction.tsx`: the square buttons, now shared.

**New idea: escaping**

Owners paste our code into their own site. If a venue name had a `"` in it, the code could break or, worse, run something. `embedSnippet` turns `"`, `<`, `>`, `'` and `&` into safe codes first. The test with `<script>` proves it.

**Try it yourself**

Copy the code, paste it into a file called `test.html`, and open that file in your browser.

---

## 2026-11-03 · Sizes for a dish

**What we built**

In the dish editor, under Add-ons, there's a new **Add sizes** button. It adds a "Size" group with Small, Medium and Large. The guest must pick one. You type how much more each bigger size costs.

**How it works**

```
dish price GH₵50  +  Size: Small +0 / Medium +10 / Large +20
guest picks Large → the order line is GH₵70
```

Sizes are just an add-on group with the rule "Pick one". The server already adds the chosen add-on's price to the dish price, so we didn't need to change the API.

**Files to look at**

- `src/features/owner/screens/menu/addOnPresets.ts`: `sizeGroup` and `blankGroup`.
- `src/features/owner/screens/menu/GroupCard.tsx`: one group, now in its own file.
- `src/mocks/mockClient.ts` (search `extra`): where the add-on price is added.

**New idea: reuse a model before inventing one**

We could have added a new "variations" field to the API. Using the add-on group we already had gives the same result with no API change, no new server code and no new tests for the money maths.

**Try it yourself**

Edit a dish, add sizes, set Large to 20 and save. Then order it as a guest and check the line total.

---

## 2026-11-03 · Sale price, stock and limits per dish

**What we built**

In the dish editor, a new "Pricing and stock" part has:
- a status: Available, Out of stock or Hidden
- a sale price (optional)
- a stock count (empty means unlimited)
- min and max per order

Guests see the sale price with the old price crossed out. Hidden dishes don't show, and the quantity buttons stop at your limits. When stock reaches 0, the dish shows as Sold out.

**How it works**

```
src/lib/dishRules.ts  (one set of rules)
   ├─ guest screens: unitPrice, quantityLimits, isOnGuestMenu
   ├─ owner editor:  dishStatus / statusFields
   └─ mock server:   checkLine, takeStock, unitPrice  ← the real server will use the same file
```

The server always has the last word on money and stock. The guest screens only help people stay inside the rules.

**Files to look at**

- `src/lib/dishRules.ts` and its test.
- `src/features/owner/screens/menu/DishStockFields.tsx` and `checkStock` in `forms.ts`.
- `src/features/menu/DishPrice.tsx`: the price with the sale.

**New idea: one status from two fields**

The API stores `available` and `hidden`. The owner sees one choice with three options. `dishStatus` turns two yes/no fields into one word, and `statusFields` turns it back.

**Try it yourself**

Set a dish's sale price above its normal price. The form stops you. In `dishRules.test.ts`, find the test that says the server would ignore it too.

---

## 2026-11-04 · Store notice: a banner and a popup

**What we built**

A Store notice page for the owner with two cards:
- **Scrolling banner:** runs across the top of the home and menu pages.
- **Popup:** shows once when a guest opens the page.

Each has a show/hide switch, the words, and optional start and end times, like "2026-11-04 18:00".

**How it works**

```
owner types → checkNotice (words, times, end after start) → saved on the venue
server → guests get only notices that are on and inside their times (liveNotices)
guest app → checks the times again every minute (useLiveNotices)
```

The phone remembers which popup a guest closed, by its words, so it doesn't pop up again. If the owner changes the words, it shows once more.

**Files to look at**

- `src/lib/notices.ts`: when a notice is live.
- `src/features/owner/desk/noticeForm.ts`: reading typed times in the venue's time zone.
- `src/features/notices/StoreNoticeBanner.tsx` and `StoreNoticePopup.tsx`.

**New idea: time zones**

"18:00" means different moments in Accra and London. We read typed times in the venue's own zone (`hours.timezone`) and save them as one exact moment (UTC). Every phone then shows them right, wherever the owner is.

**Try it yourself**

Set a banner with an end time two minutes from now, open the guest home and wait. It goes away by itself.

---

## 2026-11-04 · Menu style: dish order, list or grid, light or dark

**What we built**

Branding → Look has a new **Menu style** part with three choices:
- **Dish order** in each section: your order, Popular first, A to Z, or price low or high
- **How the menu opens:** a list or a grid. Guests can still switch.
- **Guest pages:** Light, Dark, or Follow phone

The default is your order, a list, and light, so nothing changes until you pick.

**How it works**

```
venue.menuStyle → menuStyleOf (fills the defaults)
   ├─ MenuScreen: sortDishes(items, itemSort), opens in `layout`
   └─ [venue]/_layout: guestScheme(colorScheme, phone) → the dark or light theme for every guest page
```

Dark mode was cheap because the guest screens ask the theme for colours by their job ("background", "text") and never type a colour code. Switching the theme switches every screen.

**Files to look at**

- `src/lib/menuStyle.ts` and its test.
- `src/features/owner/screens/branding/MenuStyleSection.tsx`.
- `src/app/[venue]/_layout.tsx`: where light or dark is picked.

**New idea: a stable sort**

When two dishes tie (both "popular"), a stable sort keeps them in the order they had before. So "Popular first" still respects how you arranged each group.

**Try it yourself**

Pick Dark and Grid in Branding, save, and open your guest menu.

---

## 2026-11-04 · Edit the menu on a live phone preview

**What we built**

On a wide screen, Menu now opens as a **Live preview**. Your guest menu sits in a phone frame, in your own colours and font. On the right are your menu link, a **Menu is published** switch, and the menu style choices.
- Tap a dish to edit it.
- Each section has **Add dish**, an edit button and, when dish order is "Your order", a **Reorder** button where you drag dishes into place.
- On a phone, switch between Live preview and List at the top.

When the menu isn't published, guests see a "Not open yet" page, and orders are refused.

**How it works**

```
PhonePreview ─ uses the guest's own DishRow, inside the venue's theme
   tap dish → DishEditor   Reorder → DragList → dishPositions → save only what moved
MenuRail ─ each change saves at once (useSaveVenue), so the preview updates beside it
```

**Files to look at**

- `src/features/owner/screens/menu/live/`: `LiveMenu`, `PhonePreview`, `PreviewSection`, `ReorderSheet`, `MenuRail`.
- `dishPositions` in `menu/reorder.ts` and its test.
- `src/app/[venue]/_layout.tsx`: where an unpublished venue shows the closed page.

**New idea: reuse the real component**

The preview draws dishes with the same `DishRow` guests get, inside the venue's theme. What you see is what guests see, and if we change `DishRow` later the preview changes with it.

**Try it yourself**

Switch "Menu is published" off, then open your menu link in another tab.

---

## 2026-11-04 · Orders by date, and orders staff type in

**What we built**

Orders has a second row of chips: All time, Today, Yesterday, Last 7 days and Last 30 days. There's also a **Create order** button for owners, managers and waiters, for a guest at the counter or on the phone. You pick a table (or Counter), add dishes, choose their options and add a note. The order goes to the kitchen like any other.

**How it works**

```
range chip → orderRange(range, now, venue time zone) → { since, until } → ownerListOrders
Create order → manualOrder(lines) → checks + estimate → ownerCreateOrder → same pricing as guests
```

The server works out the real total. The amount on the button is only a guide.

**Files to look at**

- `src/features/owner/desk/orderRange.ts` and `manualOrder.ts`, with their tests.
- `src/features/owner/screens/orders/CreateOrderSheet.tsx` and `PickDishRow.tsx`.
- `placeOrder` in `src/mocks/mockClient.ts`: one path for guest and staff orders.

**New idea: idempotency**

The sheet makes one id when it opens and sends it with the order. If the phone's connection drops and the order is sent again, the server sees the same id and returns the first order instead of making a second one.

**Try it yourself**

Create an order for the Counter, then find it under New. It says Takeaway, because it has no table.

---

## 2026-11-04 · Today: orders, pending and visitors

**What we built**

Today now shows six numbers:
- Orders today
- Pending (orders the kitchen hasn't started; red when any are waiting)
- Visitors today
- Waiter calls
- Open tables
- Rating

Sales today stays in the panel at the top whenever payments are on.

**How it works**

```
server: summarizeDay → ordersToday (no cancelled, since the venue's midnight), pendingOrders (received)
        guest sessions started today → visitorsToday
app:    one dashboard call, polled every 5 s → six tiles
```

A "visit" is one table scan or one opened menu link. We count visits, not people, and never learn who the guest is.

**Files to look at**

- `src/features/owner/desk/daySummary.ts` and its test.
- `src/features/owner/screens/dashboard/DashboardScreen.tsx`.

**New idea: count on the server**

The app could count orders itself, but then each phone might count differently, for example around midnight. The server counts once, and every screen shows the same number.

**Try it yourself**

Create an order from Orders, then go back to Today. Orders today and Pending each go up by one.

---

## 2026-11-04 · Online ordering settings

**What we built**

A new **Online ordering** page under Settings:
- **Take online orders**, the main switch for your menu link (table QR orders aren't affected)
- **Pickup**, with how many minutes until it's ready
- **Delivery**, with the lowest fee, the fee per km, the furthest distance, and an optional amount from which delivery is free

A line under the delivery fields works out an example as you type, like "3 km with GH₵50 of food, delivery is GH₵10".

**How it works**

```
form text → checkOrdering → settings in pesewas → saved on the venue
deliveryQuote(settings, km, food) = free above the threshold, else max(lowest fee, km × per km)
```

`deliveryQuote` lives in `src/lib`, so the guest checkout (next) and the server use the same rule.

**Files to look at**

- `src/lib/onlineOrdering.ts` and its test: the fee rule.
- `src/features/owner/desk/orderingForm.ts` and its test.
- `src/features/owner/screens/ordering/OnlineOrderingScreen.tsx`.

**New idea: a test that finds a bug**

While writing the form test, "-1" was accepted as GH₵1.00. `parseMoneyInput` threw away the minus sign. We fixed it at the root, in `src/lib/money.ts`, so no money field anywhere can take a negative number.

**Try it yourself**

Set the fee per km to 5 and watch the example change. Then set "Free from" to 40.

---

## 2026-11-04 · Ordering from the menu link: pickup and delivery

**What we built**

Someone who opens your menu link (from Instagram, TikTok or WhatsApp) can now order without sitting at a table. At checkout they choose **Pickup** or **Delivery** (only what you offer) and give their name and phone. For delivery they also give the address and tap **Use my location**. They see the delivery fee before they send. After sending, their status page says Pickup or Delivery, shows the address and fee, and says how to pay.

On your Orders screen these show as "Pickup · Esi" or "Delivery · Esi". Open the ticket to see the name, a tap-to-call phone number and the address. On the Online ordering page, **Use my current location** puts your venue on the map; stand in the venue when you tap it.

Table QR orders work exactly as before.

**How it works**

```
no table → menu-link visit → LinkCheckoutCard → checkCheckout (name, Ghana phone, address, location)
   fee = checkFulfilment → distanceKm(venue pin, phone location) → deliveryQuote
send → start a session for this visit (no personal data) → createOrder with fulfilment
server → same checkFulfilment → source, fee in the total, or a clear refusal
```

**Files to look at**

- `src/features/orders/linkCheckout.ts` and its test, and `LinkCheckoutCard.tsx`.
- `src/lib/onlineOrdering.ts` (`checkFulfilment`) and `src/lib/geo.ts` (`distanceKm`).
- `src/features/owner/screens/orders/OrderContact.tsx`.

**New idea: personal data stays where it's needed**

The name and phone live only in the checkout screen while it's open, and then on the order. They aren't saved on the phone, put in a link or written to a log. That's how we follow Ghana's Data Protection Act (Act 843) while still letting the restaurant call the customer.

**Try it yourself**

Turn on online ordering with pickup only, open your menu link in a private window, and order. Then find it under New on Orders.

---

## 2026-11-04 · The Sales page

**What we built**

A **Sales** page under Sales in the sidebar, for All time, Today, Yesterday, the last 7 days or the last 30 days. It shows:
- **Six tiles:** order value, orders, completed, in progress, cancelled and discounts given
- **Order value by day**
- **Where orders came from:** tables, pickup or delivery
- **Top dishes**

**How it works**

```
range chip → orderRange (venue's midnight) → ownerGetSales(since, until)
server: orders in range → salesReport → money, counts, sources, top 5, days
```

It counts what was **ordered**, paid or not; payments come with the next box. A discount is saved on the order line when the order is placed, so if a sale ends tomorrow, today's discount still shows.

**Files to look at**

- `src/lib/sales.ts` and its test.
- `src/features/owner/screens/sales/SalesScreen.tsx`.

**New idea: freeze facts when they happen**

We could work out discounts later by comparing with today's menu prices, but prices change. Writing the discount onto the order line at the moment of ordering keeps the history true.

**Try it yourself**

Put a dish on sale, create an order for it, then open Sales. Discounts given goes up.

---

## 2026-11-04 · Payments: your own Paystack account

**What we built**

**Settings → Integrations** now has two parts.

- **Paystack (card and MoMo):** steps for finding your keys in the Paystack dashboard, a Test/Live choice (Live stays off for now), and boxes for your public and secret key. When you connect, Cravins checks the keys. After that you only ever see the last 4 characters of the secret key. **Test connection** checks the keys still work, and **Disconnect** removes them.
- **Pay in person:** switches for cash, card machine, bank transfer and MoMo to your own number, with the details guests need.

**How it works**

```
you type the secret key → it goes once to Cravins's server → stored encrypted (server, later)
the app gets back only: mode, public key, "••••9876", the date
guests get only: can I pay online? test mode? cash? MoMo number?
```

Money goes straight from the guest to **your** Paystack account. Cravins never holds it.

**Files to look at**

- `src/lib/payments.ts` and its test: key checks, the hint, what guests see.
- `src/features/owner/screens/integrations/`: `PaystackCard`, `ManualPaymentsCard`.
- `src/mocks/mockClient.payments.test.ts`: proves the secret never comes back.

**New idea: write-only secrets**

In the contract, the secret key is marked `writeOnly`. Apps can send it, but no reply ever contains it. The test reads every reply after connecting and checks the key isn't anywhere.

**Try it yourself**

Connect with `pk_test_` and `sk_test_` keys from your own Paystack test account, then try a `pk_live_` key and see why it's refused.
