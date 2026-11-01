# Learning Ozaa

Plain-language notes for Clarke. Newest at the top.

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
