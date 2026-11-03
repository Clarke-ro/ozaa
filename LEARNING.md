# Learning Ozaa

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

We brought the entire Ozaa owner side and marketing landing page to production completeness:

1. **Menu Builder & Table Print**: Custom category schedules, 14 standard allergen tags, modifier choices, sequential table codes, and printable vector table tent cards.
2. **Venue Design & Reviews**: Star gating (4–5★ to Google, 1–3★ to private feedback), custom links with scheduling, Wi-Fi QR connect strings, and brand customizer.
3. **Loyalty Hub & Camera Scanner**: Digital stamp cards with anti-fraud cooldown timers, customer roster with Act 843 filters, camera reticle scanner, and paired handheld devices.
4. **Feedback Inbox & AI**: Private guest inbox with anonymity delays, sentiment badges, and conversational "Ask Ozaa" feedback assistant.
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

A complete overhaul of the Ozaa Owner App from bare text rows into a high-fidelity, polished management dashboard across all 15 screens. We created a shared owner kit (`DeskCard`, `StatTile`, `BigStat`, `StatusPill`, `Toggle`, `DeskTabs`, `IconTile`, `CodeTile`, `ChipRow`) matching Ozaa brand tokens.

Every screen now has full features:

- **Dashboard**: Today's sales Unbounded headline, 3 metric cards, quick actions, and live order items with table code tiles.
- **Floor**: Responsive table layout grid, derived status pills, and interactive table bill sheet with cash payment marking.
- **Orders (Kitchen)**: Status tabs, ticket cards with checklists, elapsed timers, and "Start preparing" / "Mark ready" actions.
- **Calls**: Waiter call queue with caller table badge, reason pills, elapsed wait times, and resolve buttons.
- **Menu**: Food & Drinks tabs, dietary chips, available/sold-out toggles, and new dish creator.
- **Services**: Grouped toggles (`AT YOUR TABLE`, `REWARDS`, `FUN WHILE YOU WAIT`), game score stepper, and Wi-Fi credentials.
- **Reviews**: Video moderation queue with video thumbnails, star ratings, story featuring, and written review private replies.
- **Payments**: Payout account verification, transaction list with MoMo/Card/Cash filter chips, and instant refunds.
- **Tables & QR**: Table tent card / sticker visualizer with Ozaa logo, print action, and batch table creator.
- **Branding**: Live phone preview, palette presets, live WCAG contrast checker, and photo uploads.
- **Staff**: Team member cards, role tags, and phone-based invites.
- **Insights**: Range tabs, sales bar chart, top selling items, and peak service hours.
- **Setup**: 4-step onboarding wizard with progress tracker.
- **Prototypes**: Interactive prototypes for POS register, Stock inventory with auto-86, Multilingual AI waiter, and Marketing broadcast.

**How it works**

```
Ozaa Tokens (tokens.json) → Owner Kit (DeskCard, StatTile, StatusPill...) → 15 High-Fidelity Owner Screens
```

All owner screens adhere strictly to the Ozaa brand rules: clean white cards, black text, Unbounded for big money numbers, and `#D24000` orange strictly on buttons, active icons, and small status words.

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

The venue side of Ozaa. After a phone code, the owner sees today's money, the floor, kitchen tickets, waiter calls, the menu, loyalty, and the rest of the tools. On a phone the links sit on the bottom. On a tablet they sit in a sidebar.

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

A venue-branded wallet card (`WalletCard.tsx`) with the Ozaa scan-frame watermark, Bronze/Silver/Gold tiers, stamps or spend points, a rewards catalogue, and an owner Loyalty screen (`OwnerLoyalty.tsx`) to set up the programme and confirm guest claim codes.

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

The phone and web app shell. It loads the fonts, the Ozaa colours, and a fake server so we can click through Mama's Kitchen before a real server exists.

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

On a wide screen the owner sidebar now has three groups: Main, Sales and Settings. It shows your plan next to the Ozaa name, and it can fold down to a thin strip of icons. Help, your profile and Sign out sit at the bottom. Pages that aren't built yet (Categories, Store notice, Promos, Integrations, Help) open a short "Coming soon" page.

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

The "QR codes and links" page now starts with your menu link (`https://ozaa.app/<your-slug>`) and buttons to copy it, share it, or download it as a QR code. Under that is a short piece of code you can paste into your own website to show the menu there. The table QR codes are below, as before.

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
