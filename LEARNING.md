# Learning Cravins

Plain-language notes for Clarke. Newest at the top.

---

## 2026-11-15 · Slimmer chips, cards and headers on a phone

**What we built**

- **No Back arrows:** a page's title is its header. Go back with the phone's own gesture (swipe from the left edge on iPhone, back on Android).
- **Chips:** one slim chip across the app, 34 px tall with the count as a plain number ("New 2"). The visible chip stays slim, while its touch area remains 44 px tall.
- **Orders:** the chips are New, Cooking, Ready, Served, Rejected and All, with that list underneath.
- **Today and Loyalty:** three short tiles, number first and label under it, like your reference.
- **Menu:** a slimmer search box. The pencil, eye and grip are gone from section headings (they live in ⋮ → Sections). Each dish has a grip on its left for dragging, and you tap a dish to edit it. Screen readers treat the grip, dish and availability switch as separate controls.
- **Integrations:** each mark sits in a soft square tile, with the switch top right.

**How it works**

```
FilterChips (ui)  → phone? slim 34 px chip inside a 44 px touch area
Chips (kit)       → phone? the same slim size and touch area
DragList (kit)    → holds each dish row; drag the grip to move it
text size         → dish rows grow, and DragList uses the same height
```

**Files to look at**

- `src/ui/FilterChips.tsx`: the chip row every page uses.
- `src/features/owner/desk/orderBoard.ts`: `PHONE_FILTERS`, with tests.
- `src/features/owner/screens/menu/SectionGroup.tsx`: dishes in a drag list.

**New idea: a font that isn't loaded**

Loyalty's Results tiles asked for `Inter_500`, but the app only loads Inter 400 and 600, so the browser showed a serif instead. If text suddenly looks like Times, check the weight against `src/theme/fonts.ts`.

**Try it yourself**

In `FilterChips.tsx`, change `slimText` from 14 px to 16 px and look at the Orders chips. The chip can grow while the touch area stays at least 44 px. Then put it back.

---

## 2026-11-14 · A cleaner phone layout and a kitchen board

**What we built**

- **Headers:** page titles start higher. Tabs with nothing to put in the top bar (Orders, Menu) have no bar. The grey line under each title is gone on phones. Header buttons are slimmer, and "add" buttons are a round orange +.
- **Today:** the location switcher sits at the top beside the bell. The greeting is smaller, and the line under it is gone. The sales card is shorter. The three small cards are taller tiles.
- **Orders:** one row of chips (Open, Served, Rejected, All). Open shows New, Cooking and Ready, each with its two oldest tickets. Tap a stage's heading to see every ticket in it on its own page.
- **Cards:** 16 px inside on phones instead of 20. Figure rows (Loyalty, Staff, Customers) fit three small tiles in one row.
- **Integrations:** the switch sits top right, and the status goes under the name.

**How it works**

```
Orders (Open) → New ●2  >  → /owner/orders/stage/new → every new ticket
                Cooking ●2 >
                Ready ●1   >
```

`useOrderDesk` loads the orders and wires the buttons. Orders and the stage page both use it, so a ticket behaves the same on both.

**Files to look at**

- `src/features/owner/screens/orders/useOrderDesk.tsx`: the shared order logic.
- `src/features/owner/screens/orders/OrderBoard.tsx`: the three stages.
- `src/app/owner/orders/stage/[stage].tsx`: checks the stage in the URL.
- `src/ui/Button.tsx`: `SlimButtons`, the slim header buttons.

**New idea: React context**

`SlimButtons` is a context: a value a parent sets once that every child can read. PageHeader sets it on phones, and every Button inside goes slim. No screen had to change.

**Try it yourself**

In `OrderBoard.tsx`, change `side ? 3 : 2` to `side ? 3 : 1`, then reload Orders on your phone to see one ticket per stage.

---

## 2026-11-14 · iPhone-style header and motion

**What we built**

The owner app on a phone now moves and responds more like an iPhone app.

- **Header:** the Cravins name and FREE badge are gone from the top bar. The page's big title says where you are. Scroll down and the title moves up into the bar.
- **Press:** buttons, cards and tabs shrink a little under your finger and spring back.
- **Switches:** the knob slides and the colour fades. The white pill in Segmented slides to the option you pick.
- **Sheets:** short forms (Invite someone) rise from the bottom edge, with rounded top corners.
- **Orders:** a ticket that changes stage fades into its new column, and the other cards slide to make room.

If Reduce Motion is on in the phone's settings, nothing slides or shrinks. Colours still change.

**How it works**

```
finger down → PressableScale shrinks to 0.97 in 120 ms
finger up   → it springs back to 1 from wherever it is
page scroll → OwnerPage tracks scrollY → PhoneBar fades the small title in
```

All the timings live in `design/tokens.json` under `motion`.

**Files to look at**

- `src/ui/PressableScale.tsx`: the press feedback every button and card uses.
- `src/features/owner/chrome/PhoneBar.tsx`: the header and its scroll title.
- `src/features/owner/kit/Toggle.tsx` and `Segmented.tsx`: sliding controls.

**New idea: a shared value**

`useSharedValue` holds a number on the UI thread, which draws the screen. The animation reads it there, so it stays smooth even while JavaScript is busy loading orders.

**Try it yourself**

In `design/tokens.json`, change `pressScale` from 0.97 to 0.9, run `npm run gen:tokens`, and press a button. Then put it back.

---

## 2026-11-14 · The owner app on a phone

**What we built**

The canvas redesign was checked at 1440 px wide. This pass checks every owner page at 360 and 375 px, the width of most Android phones in Ghana, and fixes what broke there. Desktop and tablet look the same as before.

- **Today:** the three small figure cards are shorter, with a smaller number.
- **Figure cards (Staff, Customers, Loyalty, Billing):** an odd last card fills the row instead of leaving a gap.
- **Sales:** order value gets its own row, so "GH₵39,280" is never cut off. Long amounts in the half-width cards step down in size.
- **Switches (Branding and others):** a long option like "As you arrange" wraps onto two lines instead of becoming "As you …".
- **Floor:** the bill drops under "Table 12" instead of cutting it to "Tabl…".
- **Business, Scanner devices, Staff:** buttons and times move under the name, so the name shows.
- **QR codes and links:** the three buttons wrap inside the card.
- **Insights:** "Improve menu" sits under its sentence.

**How it works**

```
useOwnerLayout()  →  wide?  (840 px and up: sidebar)
        │
        ├─ yes → the canvas layout, unchanged
        └─ no  → the phone layout for that card
```

Each card asks the same hook, so every screen switches at the same width.

**Files to look at**

- `src/features/owner/chrome/layout.ts`: the one place the widths live.
- `src/features/owner/kit/CardGrid.tsx`: `stretchLast` for the odd last card.
- `src/features/owner/kit/Segmented.tsx`: two-line labels on phones.
- `src/features/owner/screens/staff/StaffCard.tsx`: one card, two layouts.

**New idea: flex-wrap**

A row with `flexWrap: 'wrap'` puts items side by side while they fit, then starts a new line. On FloorCard, the name and the bill share a line on a tablet. On a phone they don't fit, so the bill moves down. You don't need an `if` for that.

**Try it yourself**

Open `/owner/floor` in the browser and drag the window narrower. Watch the bill jump under the table name once the card gets too thin.

---

## 2026-11-14 · Every canvas board, full height

**What we built**

A second pass over the whole canvas, top to bottom this time, not just the first screen of each board. Sales, Insights, Notifications, Menu, Links, Calls, Loyalty, Integrations and Customers changed again. Help and Profile are new pages. Staff members and dishes now open on their own pages, like the canvas.

**How it works**

```
canvas board → screenshot (1440 wide, full height)
app page     → screenshot (same size)
side by side → fix what differs → check again
```

When the canvas shows something the contract can't do yet (reset a PIN, give a waiter tables, remove a loyalty guest), the page leaves it out. Nothing pretends to work.

**Files to look at**

- `src/features/owner/screens/help/helpTopics.ts`: the questions and the search, with a test.
- `src/features/owner/screens/profile/`: your profile page and `splitName.ts`.
- `src/features/owner/screens/business/hoursForm.ts`: closed days and "open today".
- `src/features/owner/screens/menu/useDishForm.ts`: the dish form's state, now separate from how it looks.

**New idea: a hook keeps the logic, the screen keeps the look**

`useDishForm` holds every field, the checks and the save. `DishForm` only draws boxes and buttons. When the dish editor moved from a sheet to a page, only the drawing changed. The rules for prices and stock stayed exactly the same.

**Try it yourself**

Add a question to `HELP_GROUPS` in `helpTopics.ts`, put its words in `en.json` under `ownerHelp.q`, then search for it on the Help page.

---

## 2026-11-13 · The last ten screens laid out like the canvas

**What we built**

These screens now follow their canvas boards: Staff, Reviews, Feedback, Settings, Call details, Loyalty, Insights, QR codes and links, Integrations, and the sidebar rows.

- **Figures:** big white figure cards on top.
- **Filters:** chips with counts instead of tabs.
- **Section titles:** above their cards, not inside.
- **Buttons:** tinted for the main step on each card.

**How it works**

```
kit/FigureRow     → Staff, Loyalty figure cards
kit/Section       → plain sections put the title above the card (Settings, venue pages)
ChipRow + counts  → Staff, Reviews, Feedback, Loyalty, Insights filters
```

Most changes are in shared pieces, so one change fixes many screens.

**Files to look at**

- `src/features/owner/kit/FigureRow.tsx` and `kit/Section.tsx`.
- `screens/reviews/RatingSummary.tsx` and `reviewStats.ts`, with a test.
- `screens/insights/FunnelCard.tsx` and `insightsModel.ts`: the share of the step before, and the drop-off tip.

**New idea: don't draw what the data can't back up**

The canvas shows "Agreed to offers", menu views per dish, and Google, Tripadvisor and WhatsApp connections. The app's contract has no data for these yet, so the screens leave them out instead of showing made-up numbers.

**Try it yourself**

In Insights, pick "This week". The funnel and the cards all change together, because they come from one report.

## 2026-11-13 · Orders, Floor, Calls, Menu and Sales laid out like the canvas

**What we built**

Five screens now follow their canvas boards:

- **Orders** is a board with New, Cooking and Ready columns.
- **Floor** has chips with counts and white table cards.
- **Calls** has chips and a grid of call cards with Reply and Snooze.
- **Menu** shows the dish list beside the phone preview.
- **Sales** has date chips, including This week, This month and Pick dates.

Each card's next step is a button tinted in its stage's colour, for example orange "Start cooking", blue "Mark ready" and red "On my way".

**How it works**

```
STATUS_TONES (palette.ts)  →  Button tone="tinted" tint="info"
     order · info · success · alert · bill   →   chips, column lines, count badges
```

Each colour is written once in `palette.ts`, and a test checks that every label reads clearly on its tint.

**Files to look at**

- `src/theme/palette.ts` (`STATUS_TONES`) and `palette.test.ts`.
- `src/features/owner/desk/orderBoard.ts` and `desk/salesRange.ts`, both with tests.
- `screens/orders/OrderBoard.tsx`, `screens/floor/FloorCard.tsx`, `screens/calls/CallCard.tsx`, `screens/menu/SectionGroup.tsx`.

**New idea: colour plus words**

Colour helps you scan, but some people can't see it well. So every tinted button also says what it does, and every count has a label.

**Try it yourself**

In Sales, pick "This week", then look at the change line. It compares with last week, worked out in `previousSalesRange`.

## 2026-11-13 · Walking the owner app end to end (BUILD.md box 4c.9)

**What we built**

A test that uses the owner app the way you would: answer a call, start an order, switch location, stamp a guest, sign in as a waiter, and open a brand-new venue.

**How it works**

```
sign in → click sidebar items (never type URLs, so the mock keeps its state)
       → do the job → check every place that should change agrees
```

Answering Table 4's call must lower the Calls badge and also clear it from Floor and Today. That proves all three read one source.

**Files to look at**

- `e2e/owner-walkthrough.spec.ts`

**New idea: waiting for the page, not for time**

Data loads a moment after the page opens. `expect.poll(...)` checks again and again until the badge shows, instead of guessing with a fixed pause. Tests that guess pass on a fast laptop and fail on a slow one.

**Try it yourself**

Run `npx playwright test e2e/owner-walkthrough.spec.ts`, then break one thing (for example hide the Calls badge) and watch which test catches it.

## 2026-11-13 · The canvas sizes in the code (part of Phase 4c)

**What we built**

The owner app now uses the measurements from the design canvas: 24 px page titles, 16 px body text, 18 px section titles, 30 px figures (38 px on Today), 48 px pill buttons and fields, 40 px chips, cards with 16 px corners and 20 px padding, a 40 px page margin, and columns 900, 1000 or 1240 px wide. Today matches its board: label over number, a count badge on "Needs you", and one-line rows.

**How it works**

```
design/tokens.json  →  npm run gen:tokens  →  src/theme/tokens.ts
  owner.type / owner.controls / owner.page        ↓
                         Button, Field, chips, cards, OwnerPage read them
```

The numbers are written once, in `tokens.json`. Components read them, so a change there reaches every screen.

**Files to look at**

- `design/tokens.json`, the `owner` block.
- `src/ui/Button.tsx`: the `pill` look the owner theme turns on.
- `src/features/owner/kit/FigureCard.tsx`, `cardStyle.ts`, `Field.tsx`.
- `src/features/owner/screens/dashboard/`: `StatCard`, `HeroCard`, `NeedsYou`.

**New idea: design tokens**

A token is a named design value, like `controls.height = 48`. Code says "the control height", not "48". Designers and code then share one source of truth.

**Try it yourself**

Change `owner.controls.cardRadius` to 8 in `tokens.json`, run `npm run gen:tokens`, and see every owner card get sharper corners.

## 2026-11-12 · Menu and links tidy-up (BUILD.md box 4c.4)

**What we built**

Sections are edited only on Menu now (the old Sections page sends you there). A dish has a Popular switch. Custom links have up and down arrows to set their order on the guest page.

**How it works**

Moving a link renumbers every link in its group 0, 1, 2… and saves only the ones that changed, so the order can't get stuck with two links at the same number.

**Files to look at**

- `src/features/owner/screens/links/moveLink.ts` and its test.
- `src/features/owner/screens/menu/DishEditor.tsx`: the Popular switch.

**New idea: a redirect**

`app/owner/categories.tsx` is a route that only says "go to /owner/menu". Old bookmarks and links keep working while the page itself is gone.

**Try it yourself**

Give two links the same `sortOrder` in the mock, open Custom links and move one. Watch both get clean numbers.

## 2026-11-12 · Sales and Insights from real records (BUILD.md box 4c.5)

**What we built**

Insights shows the scan → menu → order funnel, when guests come by hour, and guest mood with a link to the notes. You can pick custom dates. Sales adds how guests paid, sales by hour, by staff member, and E-VAT once tax is set up (until then, a link to set it up). When there's no earlier period, Sales says so instead of showing a wild percentage.

**How it works**

Every card reads one report from the server for the chosen dates. A card with nothing to show says so in words, so a quiet week looks quiet, not broken.

**Files to look at**

- `src/features/owner/screens/insights/insightsModel.ts`: `funnelSteps` (each step as a share of scans) and its test.
- `src/features/owner/screens/sales/SalesBreakdowns.tsx`: the new Sales cards.

**New idea: dividing by zero**

A percentage is "part ÷ whole". With zero scans, that's a division by zero, which gives `NaN` ("not a number") on screen. `funnelSteps` checks for zero first and shows 0%.

**Try it yourself**

Pick Custom dates on Insights and enter a range from last year. Every card should show its empty message.

## 2026-11-12 · Guests: customers, stamps and notes (BUILD.md box 4c.6)

**What we built**

Customers has tag filters (Reward ready, Regulars, New, Quiet lately) worked out from what guests did, search by name or last 4 digits, and an export with visits and tags. Each customer page lists their real visits and exactly what they agreed to, and "Add a stamp" works there. Scan and stamp shows a phone code on a computer, finds guests without their card, and lists today's stamps. Loyalty has switches for stamping paid orders and for 90-day stamps. "Ask about your feedback" now answers from the real notes.

## 2026-11-12 · Your profile and preferences (BUILD.md box 4c.8)

**What we built**

Settings starts with your profile: photo, first and last name, email, and your phone number, which only changes after you enter a code sent to the new number. Below that: Light, Dark or Follow my device, sound for new orders, and which notifications you get. Delete account now explains that paid orders and tax records stay for 6 years without your personal details.

**How it works**

```
stamp (scan, lookup or customer page) ──► one loyalty record
                                         ├─► Customers (stamps, tags)
                                         ├─► Loyalty results
                                         └─► Scan and stamp "Today"
pick Dark ──► saved on this device (instant) ──► saved on your profile (follows you)
turn off "Guest notes" ──► profile ──► the server leaves them out of your feed and badges
```

**Files to look at**

- `src/features/owner/screens/scan/GuestLookup.tsx` and `ScanLog.tsx`.
- `src/features/owner/screens/customers/CustomerDetailScreen.tsx`.
- `src/lib/feedbackSummary.ts` and its test.

**New idea: one hour cool-down**

A stamp can't be added twice within an hour for the same guest. That stops a double tap, or a second scan, from giving two stamps for one visit.

**Try it yourself**

Stamp a guest from their page, then press "Add a stamp" again straight away and read the message.

## 2026-11-12 · Business details, E-VAT and opening hours (BUILD.md box 4c.7)

**What we built**

Business and locations now holds the business's description, categories, cuisines, price range, year opened, website, phone, email, TIN and registration number. Each location can have a GhanaPostGPS digital address. The open location has an E-VAT switch (prices with tax inside, or tax on top) and an opening-hours editor. Branding, Services, Online ordering and Social links were already built on real data.

**How it works**

Switching E-VAT on is saved on the venue, never shown to guests (the TIN stays private). From then on, orders carry VAT, NHIL and GETFund lines, and Sales shows their totals.

**Files to look at**

- `src/features/owner/screens/business/BusinessDetails.tsx`, `TaxSection.tsx`, `HoursSection.tsx`.
- `src/features/owner/screens/business/hoursForm.ts` and its test.

**New idea: checking input against a pattern**

A TIN is a letter and ten digits. The code checks that with a "regular expression", `^[A-Z]\d{10}$`, before saving, so a typo is caught on screen, not on a receipt.

**Try it yourself**

Switch E-VAT on, place an order, then open Sales: the E-VAT card now shows totals.

- `src/features/owner/screens/settings/ProfileSection.tsx`, `PhoneSheet.tsx`, `PrefsSection.tsx`.
- `src/app/owner/_layout.tsx`: picks the light or dark theme.

**New idea: confirm before you change**

A phone number is how you sign in. If a typo changed it straight away, you'd be locked out. So the change waits until a code sent to the new number comes back.

**Try it yourself**

Turn off Orders under Notifications and watch the Notifications count in the sidebar drop.

---

## 2026-11-12 · Promos (part of BUILD.md box 4c.4)

**What we built**

Promos was a "Coming soon" page. Now you can add a discount (a percent, an amount or a free dish), choose days, hours, where it works, a minimum spend and an optional code, and switch it off without deleting it. Each promo shows Running, Scheduled, Ended or Off, and how often it was used.

**How it works**

The sheet checks what you typed (`promoForm.ts`) before saving. The server keeps the promo and, when a guest orders, takes off the single best one before tax and delivery. The app never works out the discount itself.

**Files to look at**

- `src/features/owner/screens/promos/promoForm.ts` and its test.
- `src/features/owner/screens/promos/PromosScreen.tsx`.

**New idea: a draft**

The form keeps a "draft": text exactly as you typed it, like "15" for GH₵15. Only on Save is it turned into what the API wants, like 1500 pesewas. So a half-typed amount never reaches the server.

**Try it yourself**

Add a 50% promo for Friday only, then create an order on a Friday and on another day and compare the totals.

---

## 2026-11-12 · Run the room on one feed (BUILD.md box 4c.3)

**What we built**

Notifications, "Needs you" on Today, the sidebar count and the phone bell now read one list from the server, so they always agree. Each waiter call has its own page with the guest's message, quick replies and a 1-minute snooze. Orders open on Today, and Floor shows how long each table has waited.

**How it works**

```
server feed ──► Notifications (filters, unread dots, mark all as read)
            ├─► Today "Needs you" (only items still open)
            └─► sidebar Notifications count and phone bell (unread)
reply on a call ──► call resolved ──► calls, floor, Today and the feed refresh together
```

**Files to look at**

- `src/features/owner/data/useOwnerFeed.ts`: the feed, "mark read" and where each item opens.
- `src/features/owner/screens/calls/CallDetailScreen.tsx`: one call.
- `src/features/owner/screens/calls/quickReplies.ts`: which replies a call offers.

**New idea: invalidating a cache**

The app keeps answers from the server in a cache so screens load fast. After a change, we "invalidate" the keys of everything that change touched. Every screen showing those keys fetches again, so the badge and the floor tile move without a refresh.

**Try it yourself**

In `quickReplies.ts`, add `'Back in 5 min'` for every reason, then open a call and watch it appear.

---

## 2026-11-12 · The new sidebar (BUILD.md box 4c.2)

**What we built**

The owner sidebar now has five groups: Main, Sales, Guests, Venue and Account. Your name sits at the bottom and opens your profile and settings, where Help and sign out are. The sidebar folds to icons and stays folded on every page until you open it again.

**How it works**

```
nav.ts      one list of pages: group, who may open it, listed or not
Sidebar     shows the groups; the fold choice comes from ownerPrefs (saved on this device)
Location    your locations with their own logo; picking one changes venueId,
            and every screen refetches for that venue
```

Setup and Sections are "unlisted": a link still opens them, but they aren't in the menu.

**Files to look at**

- `src/features/owner/chrome/nav.ts`: the groups and who sees what.
- `src/features/owner/data/ownerPrefs.ts`: the saved fold.
- `src/features/owner/chrome/SidebarFooter.tsx`: the owner button.

**New idea: persisted state**

Most screen state is forgotten when you leave the page. `persist` writes a small value to the device's storage and reads it back on load, so a choice like "keep the sidebar folded" survives page changes and the next visit.

**Try it yourself**

In `nav.ts`, move `promos` from `sales` to `guests` and run `npx jest src/features/owner/chrome`. Watch the test that pins each group's pages fail.

---

## 2026-11-12 · One set of records behind every owner screen (BUILD.md box 4c.1)

**What we built**

The contract and the mock now hold everything the new owner screens need: call replies and snooze, promos, notifications, customer tags, Sales comparisons, the Insights funnel, business details and your profile. No screen has to make up a number.

**How it works**

```
30 days of paid orders ─┬─► Sales (vs the week before, by hour, by staff)
guest visits ───────────┼─► Insights funnel: scanned → opened menu → ordered
members' stamps ────────┼─► Customers and Loyalty (same member count)
calls, orders, notes ───┴─► Notifications, badges, Floor, Calls
```

Before, Insights and Customers returned fixed sample numbers, so Today could say 37 visitors while Insights said something else. Now one seed (`seedHistory.ts`, `seedMembers.ts`) builds the records and every figure is worked out from them, the same way the real server will.

**Files to look at**

- `src/lib/promos.ts`: which promo applies to a bill. The biggest single one wins.
- `src/lib/insights.ts` and `src/lib/sales.ts`: figures from orders and visits.
- `src/lib/notificationFeed.ts`: one feed for Notifications and the badges.
- `src/features/waiter/callUpdate.ts`: on my way, reply (which finishes the call) and snooze.

**New idea: one source of truth**

If two screens each keep their own copy of a number, they drift apart. Here every screen asks for the same records and does its own sums, so they can't disagree.

**Try it yourself**

In `src/lib/promos.test.ts`, change the happy-hour window to `18:00`–`20:00` and run `npx jest src/lib/promos.test.ts`. Watch which test fails, and why.

---

## 2026-11-12 · Splitting the real-server client

**What we changed**

`src/lib/api/http.ts`, the client that talks to the real server, was 644 lines. It's now six area files plus a 19-line `http.ts` that joins them, the same pattern as the mock split.

**How we proved nothing changed**

No test called `http.ts` directly. So, for this PR only, a throwaway test built the old and the new client side by side with a fake `fetch`, called all 87 methods on both, and compared every request: method, address, headers and body. All 87 matched. Then we deleted the throwaway test.

**Files to look at**

- `src/lib/api/httpContext.ts`: the shared parts (`headers()` adds the sign-in token and the idempotency key).
- `src/lib/api/httpGuestCalls.ts`: one area, short enough to read in one go.

**New idea: a characterisation test**

When you move code that has no tests, record what the old code does and check the new code does the same thing. You don't need to know what's right, only that nothing changed.

**Try it yourself**

Open `httpContext.ts` and find where `Idempotency-Key` is added. Then find a call in `httpOwnerOrderCalls.ts` that sends one.

---

## 2026-11-12 · Splitting the mock API into areas

**What we changed**

`src/mocks/mockClient.ts` was 1,661 lines: every pretend server call in one file. It's now eleven files of 80 to 231 lines. The code inside each call didn't change, and the same 41 mock tests pass before and after.

**How it works now**

```
createMockClient()
  └─ createMockContext()          one shared world, tokens, clock
       ├─ mockAuthCalls(ctx)      sign-in, guest session
       ├─ mockGuestCalls(ctx)     menu, order, bill, pay
       ├─ mockOwnerOrderCalls(ctx) ...and five more areas
       └─ { ...auth, ...guest, ... }  joined into one ApiClient
```

**Files to look at**

- `src/mocks/mockClient.ts`: the join, now 80 lines.
- `src/mocks/mockContext.ts`: what every area shares.

**New idea: pass the shared state in**

The calls used to share state because they all sat inside one big function. Now each area is a function that takes `ctx`, the shared state, and returns its calls. Every area still sees the same world, so an order a guest places is still the one the owner sees. TypeScript checks that the joined object has every method `ApiClient` asks for: leave one out and `tsc` fails.

**Try it yourself**

Comment out `...mockOwnerDeskCalls(ctx),` in `mockClient.ts` and run `npx tsc --noEmit`. Read which methods it says are missing, then put the line back.

---

## 2026-11-12 · Fewer Vercel deploys

**What we changed**

One repo feeds two Vercel projects: the app (guest table pages and the owner app) and the landing site. Every push to any PR branch built both as previews, and every merge built both again. Ten merges in one evening hit Vercel's daily limit.

**How it works now**

```
push to a PR branch   ─►  nothing deploys
merge to main         ─►  landing/ changed?            ─► landing builds
                      ─►  app files (or pricing) changed? ─► app builds
                      ─►  only docs, server, e2e, .md  ─► nothing builds
```

**Files to look at**

- `vercel.json` and `landing/vercel.json`: `git.deploymentEnabled` lets only `main` deploy; `ignoreCommand` decides whether to build.
- `scripts/vercel-skip-app.sh`: the app's rule, with comments.

**New idea: the ignored build step**

Before building, Vercel runs `ignoreCommand`. Exit code 0 means "skip", anything else means "build". `git diff --quiet A B -- folder` exits 0 when nothing in that folder changed between two commits, so it fits exactly. When in doubt (an unknown commit, a manual redeploy), the rules build.

**Try it yourself**

Run `git diff --quiet HEAD~1 HEAD -- landing; echo $?` in Git Bash. 0 means the last commit didn't touch the landing site.

---

## 2026-11-11 · Removing calls nobody uses

**What we changed**

Four API calls had no screen using them. Two were the old "payout account" (from when Paystack split the money and Cravins took a share). One was "mark paid in cash", replaced by "mark paid" with a method (cash, card machine, transfer, MoMo). The fourth was the Paystack webhook in the app's client, but only Paystack calls that, and it calls the server, never the app.

**How it works now**

```
api/openapi.yaml ──npm run gen:api──► src/lib/api/schema.ts ──► client.ts, http.ts, mockClient.ts
```

We cut the payout and cash calls from the contract, regenerated the types, then the type checker pointed at every place that still used them. The webhook stays in the contract because the server in `server/` still answers it.

**Files to look at**

- `api/openapi.yaml`: the contract.
- `src/lib/api/client.ts`: the list of calls the app can make.

**New idea: dead code costs something**

A call nobody uses still has to be read, kept in the mock, and built on the server. Worse, it can mislead: someone might build the payout screen again, against your decision that Cravins never holds funds.

**Try it yourself**

`getLeaderboard` is still in the contract but no screen calls it. Search for it, then find where the game board gets its scores instead.

---

## 2026-11-09 · Demo builds and real builds

**What we fixed**

Some sample things showed in every build, even one pointed at a real server: the owner sign-in came pre-filled with a made-up number and offered three sample accounts, the landing page had a button to a sample table, and the game board listed five made-up players. Two sample-account labels were also wrong ("Manager", "Waiter" for numbers that are owners in the mock).

**How it works now**

```
EXPO_PUBLIC_API_MODE=mock  ─►  DEMO = true   sample logins, sample table, sample scores, test numbers
EXPO_PUBLIC_API_MODE=http  ─►  DEMO = false  none of them
```

All sample people and places live in `src/mocks/demo.ts`. The mock world and the screens both read from it, so the sign-in buttons can't disagree with who the mock thinks is signed in.

**Files to look at**

- `src/lib/demo.ts`: the one `DEMO` switch.
- `src/mocks/demo.ts`: sample staff, the code `123456`, loyalty members, the game board.

**New idea: one source of truth for demo data**

When the same sample person is typed in two places, the two copies drift apart (that's how "Bean There (Manager)" happened). Keep the data once and build the labels from it.

**Try it yourself**

Set `EXPO_PUBLIC_API_MODE=http` in `.env`, open `/owner/login`, and see the sample buttons disappear.

---

## 2026-11-09 · Staying signed in: refreshing the owner's token

**What we built**

An owner's access token works for an hour. Before this, nothing renewed it: on a real server every owner page would start failing after an hour, until you signed out by hand. Now the app quietly swaps the refresh token for a new access token and carries on. Sign out also tells the server, so the old token can't be used again.

**How it works**

```
owner call ─► 401 "expired"
   └─► refresh once (every screen that failed waits on the same refresh)
         ├─ new tokens ─► save them ─► try the call again ─► screen carries on
         ├─ refused    ─► sign out ─► cached owner data wiped ─► sign-in page
         └─ offline    ─► stay signed in, the screen shows its offline message
```

**Files to look at**

- `src/lib/api/ownerRetry.ts`: catches the 401 on owner calls and tries once more.
- `src/features/session/ownerRefresh.ts`: does the refresh, only one at a time.
- `src/app/owner/_layout.tsx`: wipes owner data whenever the sign-in ends.

**New idea: single flight**

Five owner screens poll at once, so an expired token fails five calls together. If each started its own refresh, the first would use up the refresh token (it works only once) and the other four would be refused and sign you out. So the first caller starts the refresh and the rest wait for that same answer. That's called a single-flight request.

**Try it yourself**

In `ownerRefresh.test.ts`, change the "many calls" test to start 10 calls. How many times does the server get asked?

---

## 2026-11-09 · Fix: what's left to pay on a bill

**What we fixed**

Two ways the bill came out wrong:

- Three friends split a GH₵300 bill. One pays GH₵100 as an equal share. The next taps **Pay the whole bill** and was asked for GH₵300 again, not GH₵200.
- A delivery order paid with **Pay the whole bill** left out the delivery fee, so the order stayed part paid.

**How it works now**

```
what's left = order total (dishes + delivery fee) − already paid
whole bill  = what's left
equal share = what's left ÷ people still to pay (rounded up)
my dishes   = the dishes you pick, never more than what's left
```

Before, "what's left" was worked out by adding up the dishes not marked paid. An equal share pays money, not dishes, so no dish was ever marked and the old sum never went down.

**Files to look at**

- `src/features/pay/quoteBill.ts` and its test.
- `src/mocks/mockClient.payments.test.ts`: the same rule through the mock API.

**New idea: one source of truth**

The order already says its total and how much is paid. Working the same number out a second way (from the dishes) gave a second answer that could disagree. Read the number the server gives you instead of rebuilding it.

**Try it yourself**

In `quoteBill.test.ts`, add a test where two people pay equal shares of a GH₵100 bill, then a third pays the whole bill. What should the third person pay?

---

## 2026-11-09 · Owner pages, round 3: cards, full pages and a warmer background

**What we built**
Your fixes from today. Finished setup steps drop off Today. Menu previews both the online menu and the table page walk-in guests see. Orders shows one card per order, with no calls on top, and each card opens a full page. Floor puts the tables that need you first. Calls is a board. Customers are small cards that open a full page. Pages are narrower and sit on a very light orange background.

**How it works**

```
Floor:  tables → groupTables() → Needs you | Eating | Free
Calls:  calls  → callBoard()   → Waiting | On the way | Done
Orders: tap a card → /owner/orders/ord_123 → finds that order in the list you already loaded
```

**Files to look at**

- `src/features/owner/screens/floor/floorGroups.ts`: sorts tables into the three bands.
- `src/features/owner/screens/calls/callBoard.ts`: splits calls into columns and finds the most common request.
- `src/features/owner/screens/orders/orderSteps.ts`: the order timeline (received, preparing, ready, served).
- `src/app/owner/orders/[id].tsx`: the full order page's route.
- `design/tokens.json`: `canvas` (the background) and `owner.page.form` (page width).

**New idea: a route with a blank in it**
`[id].tsx` is a file name with a blank to fill in. `/owner/orders/ord_7` and `/owner/orders/ord_9` both open the same screen, and the screen reads the blank (`id`) to know which order to show. The customer page works the same way.

**Try it yourself**
In `floorGroups.ts`, swap the order of `'attention'` and `'eating'` in `ORDER`, run `npm test`, and watch the test that says "attention first" fail. Then put it back.

---

## 2026-11-09 · The first server: Paystack in test mode (BUILD.md 2b)

**What we built**
A small server in `server/` that talks to Paystack with your test key. It can start a MoMo charge or a card checkout, check a payment, and accept Paystack's signed messages (webhooks). The app can send just its payment calls there (`EXPO_PUBLIC_API_LIVE=payments`) while everything else stays on the mock.

**How it works**

```
app (mock bill) ──POST /payments + the quote──▶ server ──▶ Paystack /charge or /transaction/initialize
app ──GET /payments/{ref} every 3 s──▶ server ──(every 5 s)──▶ Paystack /transaction/verify
Paystack ──signed webhook──▶ server   (refused if the signature is wrong)
server says "succeeded" ──▶ app marks the mock order paid
```

**Files to look at**

- `server/src/status.ts` and its test: how Paystack's answer becomes ours. Only "success" for the right amount counts.
- `server/src/signature.ts`: checking a webhook really came from Paystack.
- `server/src/payments.ts`: starting, refreshing and finishing a payment.
- `server/README.md`: how to run it with your key, and what to know before testing.

**New idea: a signature proves who sent a message**
Anyone can send our webhook address a message saying "paid". Paystack takes the message and our secret key and computes a code from them (HMAC-SHA512) that only someone holding the key can make. We do the same calculation, and only if the two codes match do we believe it.

**Try it yourself**
Run `npm test` in `server/`. Then in `signature.test.ts`, change one letter of the body after it's signed and watch the test refuse it.

---

## 2026-11-09 · The guest's receipt (BUILD.md box 2.6)

**What we built**
After paying, a guest can tap See receipt. It shows the venue, order, table and time; every dish, the subtotal and the table total; then their share, the tip, what they paid, how, and the payment reference. Test payments say "Test payment. No money moved." at the top.

**How it works**

```
/{venue}/receipt?reference=pay_105
  GET /payments/pay_105  → amount, tip, method, test or not
  GET /orders/{orderId}  → dishes, subtotal, taxes, total, paid so far
  receiptFigures(order, payment) → the numbers on the page
```

Tax lines come straight from the order. The list is empty today, and VAT, NHIL and GETFund will appear on their own once E-VAT is switched on, with no change to the screen.

**Files to look at**

- `src/features/pay/receiptFigures.ts` and its test: share, tip, still to pay.
- `src/features/pay/ReceiptScreen.tsx`: the page.
- `src/app/[venue]/receipt.tsx`: the route.

**New idea: build for data that isn't there yet**
Ghana's E-VAT lines aren't switched on, but the contract already has a `taxes` list. Drawing whatever is in that list, even when it's empty, means the receipt is ready the day the server starts sending tax lines.

**Try it yourself**
Pay a split bill (Split equally, 2 people) at `/bean-there/t/7`, then open the receipt. "Still to pay at the table" shows the other half.

---

## 2026-11-09 · Paying by card (BUILD.md box 2.5)

**What we built**
A guest can pay by debit or credit card. Cravins opens Paystack's card page. On the web it opens in the same tab; in the app it opens in the in-app browser. When they come back, the app checks the payment and shows Paid. If they cancelled, it shows "Not paid. Nothing was taken." with Try again.

**How it works**

```
Pay by card → Paystack's card page
   web: Paystack sends the guest to /{venue}/pay?reference=…   (a fresh page)
   app: the guest closes the in-app browser
→ "Still checking…"  (POST /payments/{reference}/verify)
     succeeded → Paid
     abandoned → Not paid, nothing taken
```

The reference in the address is all the app needs. It asks the server, and only "succeeded" counts.

**Files to look at**

- `src/features/pay/openCheckout.ts`: where the card page opens on each platform.
- `src/features/pay/useCardReturn.ts`: picks up the reference when the guest comes back.
- `src/features/pay/paymentMachine.ts`: the new `resume_check` step.
- `e2e/guest-pay-online.spec.ts`: a card that's paid and one that's cancelled.

**New idea: the address carries the state**
On the web, going to Paystack leaves our page, so everything held in memory is lost. Paystack brings the guest back with `?reference=…` in the address. That one word is enough to pick up where we left off, because the server knows the rest. It's also why we never trust the address alone: we always ask the server what really happened.

**Try it yourself**
On the test checkout page, tap Cancel, then Try again, then pay. You'll see the same screen handle both endings.

---

## 2026-11-09 · Waiting for a MoMo approval (BUILD.md box 2.4)

**What we built**
After a guest taps Pay with MoMo, they see "Approve on your phone", what they're paying, and a 3:00 countdown. Then one of three endings: paid, didn't go through (with the network's reason), or time ran out. The last two say nothing was taken and offer Try again.

**How it works**

```
Pay → "Approve on your phone"  3:00 … 0:00   (asks the server every 3 s)
        succeeded → Paid
        failed    → That didn't go through + reason
        0:00      → Still checking… (asks the server to verify, up to 5 times)
                      succeeded → Paid
                      abandoned / still open → Time ran out
```

**Files to look at**

- `src/features/pay/paymentWatch.ts` and its test: the countdown and what each server status means.
- `src/features/pay/usePaymentWatch.ts`: the timer and the checks.
- `src/features/pay/PayProgress.tsx`: the four screens.
- `e2e/guest-pay-online.spec.ts`: one payment that works, one that fails.

**New idea: never trust the countdown to say "failed"**
The countdown runs on the guest's phone, and phone clocks drift. Someone can approve at 0:01 and Paystack may report it a few seconds later. So when the clock hits 0:00 we don't say "failed". We ask the server again a few times first. Only the server's word moves money, and only "succeeded" counts as paid.

**Try it yourself**
In the mock, a MoMo number ending in 0 fails and one ending in 9 never gets approved. Pay at `/bean-there/t/7` with 0241234569 and wait three minutes to see Time ran out.

---

## 2026-11-08 · A clearer Setup, with Skip on payments

**What we built**
Setup is easier to follow. It opens on its own, with no tab bar or sidebar, just Close. Each step asks one question, each field has its label on the page and a rounded box to type in, Wi-Fi and online payments can be skipped, and the end screen shows what you set up.

**How it works**

```
Venue → Tables → Wi-Fi (Skip) → How guests pay (Connect Paystack, or Skip for now)
                                         ↓
                          "You're ready": Venue · Tables · Wi-Fi · Payments
                          tap a line to go back and change it
```

`footerFor(step, paystackConnected)` decides the buttons under each step. `setupSummary(...)` turns what's saved into the four summary lines. Both are plain functions with tests, so the screen only draws.

**Files to look at**

- `src/features/owner/screens/setup/setupFlow.ts` and its test: the buttons and the summary.
- `SetupScreen.tsx`: the steps. `SetupFrame.tsx`: the page with Close. `SetupFooter.tsx`: the buttons. `SetupField.tsx` and `WifiStep.tsx`: the rounded fields. `SetupDone.tsx`: the end screen.
- `src/features/owner/chrome/nav.ts` (`isFocused`): pages shown without the tab bar or sidebar.
- `e2e/owner-setup.spec.ts`: skip Wi-Fi and payments, then check the summary.

**New idea: one primary action per step**
Every step has exactly one filled button: the thing most people should do next. Skip and Back are plain text buttons, so they're easy to find without competing. On Payments the filled button is "Connect Paystack", because that's the step's job, and "Skip for now" is the quiet way out.

**Try it yourself**
In `setupFlow.ts`, change Wi-Fi's `skip: 'skip'` to `skip: null` and run `npm test`. The "Wi-Fi can be skipped" test fails and shows what changed. Put it back afterwards.

---

## 2026-11-08 · Payments without the off switch (BUILD.md box 4b.17, done)

**What we built**
The app no longer has a "payments off" switch. Every restaurant takes payment: in person by default, and online too once it connects its own Paystack. Staff mark in-person bills paid from Orders or Floor.

**How it works**

```
guest eats → order served, not paid → Floor shows the table under "Bill"
  guest pays online ............ Paystack says paid → table frees
  guest pays at the counter .... staff tap Mark paid → Cash / Card machine / … → table frees
```

- Today leads with sales: money already taken, online or marked paid.
- Setup's last step is "How guests pay", with a button to Integrations.
- The old Payments page (payout account, refunds) is gone. Each restaurant sees online payments and refunds in its own Paystack dashboard. Old links go to Integrations.

**Files to look at**

- `src/features/owner/floor/floorStatus.ts`: a table frees once its bill is paid.
- `src/features/owner/desk/daySummary.ts`: the "bills to collect" count.
- `src/features/owner/screens/FloorScreen.tsx`: Mark paid opens the same sheet as Orders.
- `src/features/owner/screens/setup/SetupScreen.tsx`: the new last step.
- `e2e/pay-in-person.spec.ts`: serve a table, mark it paid in cash, watch it free up.

**New idea: deleting a mode**
For a week the code had two ways of working, payments on and payments off, and every screen asked which one it was in. Removing a mode means picking the one that stays, deleting the other branch everywhere, and deleting its tests too. The code gets shorter and there's one behaviour left to understand.

**Try it yourself**
On Floor, open a table with an order, tap through Start cooking → Mark ready → Mark served, then Mark paid → Cash. Watch the Bill count go up, then back down.

---

## 2026-11-08 · Guests pay in the app only where the venue connected Paystack (BUILD.md box 4b.17, part 4)

**What we built**
A guest sees "Pay & split bill" only at a venue that has connected its own Paystack account. Everywhere else they pay in person, and staff mark the order paid.

**How it works**

```
venue page loads → payMethods.online?
  yes → Pay card on home, Pay button on the order, MoMo or card in the app
  no  → "Pay at the counter, or ask your waiter for the bill."
        an old /pay link goes to the order instead
```

The server makes the same check. Starting a payment at a venue with no keys fails with `online_pay_off`, so the rule holds even if the app is out of date.

**Files to look at**

- `src/lib/payments.ts`: `canPayOnline`, the one place that decides.
- `src/features/venue/ServiceGrid.tsx`, `src/features/orders/StatusScreen.tsx`, `src/features/pay/PayScreen.tsx`: the three places guests meet it.
- `src/mocks/mockClient.ts` (`initializePayment`): the server-side check.
- `e2e/guest-pay-online.spec.ts`: a guest at Bean There orders, pays by MoMo, and sees it paid.

**New idea: a build switch versus data**
Before, one switch (`PAYMENTS_ENABLED`) turned payments on or off for every restaurant at once, and changing it meant a new build. Now each restaurant's own data decides: has it connected Paystack? Two restaurants on the same app can behave differently, and an owner changes it from Integrations without anyone shipping an update.

**Try it yourself**
Open `/bean-there/t/7` and see the Pay card, then `/mamas-kitchen/t/12` and see it gone. In `samplePaymentSettings` (`src/mocks/world.ts`), change `'bean-there'` to `'mamas-kitchen'`, reload, and watch the card swap places.
---

## 2026-11-08 · One column everywhere, a better QR page, analytics for Sales and Insights

**What we built**

- Every owner page is one column now, as on the reference dashboard. That covers Notifications, Custom links, Store notice, Business, Staff, Settings, Feedback, Reviews, Services, Socials, Online ordering and the loyalty form.
- **QR codes and links**: a big QR for your menu link with Download and Share, the link with a Copy button, the website code folded away, then one card for the table QR codes.
- **Sales**: each figure says how it changed against the period before ("12% vs previous 7 days"). There is a new Average order card, a line chart over every day of the period, and a card showing how orders ended up.
- **Insights**: four headline figures across, busy hours as bars, top dishes with their share of everything sold, and loyalty stamps over time.
- Settings cards now have a bold title inside the white card.

**How it works**

```
Sales page opens → asks for this period  ┐
                 → asks for the one before ┘→ percentChange(now, before) → "▲ 12%"
```

`previousOrderRange()` works out the period just before: yesterday for Today, and the 7 days before for Last 7 days. `fillDays()` puts a zero on quiet days so the chart never skips a day.

**Files to look at**

- `src/features/owner/desk/salesCompare.ts` and its test
- `src/features/owner/kit/charts/AreaChart.tsx`, `kit/FigureCard.tsx`
- `src/features/owner/screens/tables/TablesScreen.tsx`, `TableQrCard.tsx`

**New idea: comparing like with like**

A change percent only means something when both periods are the same length. That is why "today so far" compares with all of yesterday. With nothing before, we show no percent at all rather than a made-up 100%.

**Try it yourself**

In `salesCompare.test.ts`, add a test for `percentChange(150, 100)`. What should it return?

---

## 2026-11-08 · Owner app in the MenuRite layout

**What we built**

The owner app now follows the MenuRite dashboard's layout and type, in Cravins's colours.

- A light sidebar. The open page sits in a pale orange pill.
- Every page starts with a bold title, a grey line and its action on the right.
- **Today**: a black card with the day's main number, three small cards, the setup steps and a grid of shortcuts.
- **Categories**: one card per section with a ⋮ menu and a drag handle, and a dashed "Add" box.
- **Sales** and **Insights**: a period dropdown, figure cards and plain tables.
- Text is Inter everywhere at a smaller size, numbers included.

**How it works**

```
ThemeProvider (owner theme)
  ├ colours     same as before
  └ type        tokens.owner.type → every <Text> under it
```

`Text` asks the theme for sizes. The owner theme carries MenuRite's scale, and guest themes carry none, so guest pages keep the brand scale.

**Files to look at**

- `src/ui/theme.tsx`, `src/ui/Text.tsx`: the type scale
- `src/features/owner/chrome/PageHeader.tsx`, `Sidebar.tsx`
- `src/features/owner/kit/`: `PeriodSelect.tsx`, `FigureCard.tsx`, `RankTable.tsx`, `RowMenu.tsx`
- `src/features/owner/screens/dashboard/todayFigures.ts` and its test

**New idea: context**

React context hands a value to everything inside a provider without passing it through every component. The theme works this way, so changing the owner theme's `type` changed the text on every owner page at once.

**Try it yourself**

In `design/tokens.json`, change `owner.type.body.size` from 14 to 16, then run `npm run gen:tokens` and reload an owner page.

---

## 2026-11-07 · Owner app redesign, part 2

**What we built**

- **Today** is one column of sections that sit straight on the page, the same on phone, tablet and computer. There are no boxes and no side columns. Thin lines split the sections, and each section has its own shape.
- **Orders** and **Calls** are flatter. **Floor** uses the whole page, and a table's details open in a sheet.
- Each screen has at most one filled button.

**How it works**

```
Today (one column, full page width)
├ Sales today     the big number, then "14 orders today  40 visitors ..."
├ Needs you       alert bars with a coloured edge, or "all clear"
├ Live orders     "2 New  1 Cooking  3 Ready", late warnings, ruled tickets
├ Finish setup    progress bar + Continue link (owners, until done)
└ Shortcuts       a line of small pills
```

The figure lines wrap like a sentence, so they never form columns. A figure, alert or ticket opens its page only when your role may open it; otherwise it is plain text. `todayFigures()` picks the figures and `kitchenFlow()` counts the stages. Pending orders and waiter calls are left out of the figures because Live orders and Needs you already show them.

**Files to look at**

- `dashboard/DashboardScreen.tsx`: the order of the sections
- `dashboard/Band.tsx`, `InlineFigure.tsx`: the section shape and the number-plus-words phrase
- `dashboard/todayFigures.ts`, `kitchenFlow.ts` and their tests
- `floor/TableDetail.tsx`, `floor/useFloorActions.ts`

**New idea: idempotency keys**

When the Floor records cash, it sends a key with the request. If the network drops the answer and you tap again, the same key goes with it, and the server knows it is the same payment. `TableDetail` keeps one key per bill and amount, so cash is never recorded twice.

**Try it yourself**

In `NeedsYouBar.tsx`, change `SHOWN` from 4 to 2 and reload. Watch how much higher Live orders moves.

---

## 2026-11-07 · Owner app redesign, part 1: the shell, the cards and Today

**What we built**

The owner app no longer looks like a phone app stretched onto a computer.

- A **black sidebar** with the Cravins mark, your plan and location. A small orange number shows orders waiting for the kitchen and open waiter calls.
- A **top bar** on every page with a big title, the page's one action and the notifications bell.
- **Flat cards** with a thin grey line around them instead of shadows.
- **Today** got a first redesign here. Part 2 (above) replaced it with one column of cards.

**How it works**

```
OwnerChrome ─┬─ Sidebar (always the dark theme)
             └─ page ─ OwnerPage: top bar + scroll area, width "form" (880) or "wide" (1280)
                         └─ Panel ─ PanelRow, PanelRow, PanelRow   (one box, lines between rows)
```

Every size lives in `design/tokens.json` under `owner`, and `useOwnerLayout()` reads it, so every screen switches layout at the same widths.

**Files to look at**

- `src/features/owner/chrome/`: `layout.ts`, `Sidebar.tsx`, `OwnerPage.tsx`, `NotificationBell.tsx`, `useNavCounts.ts`
- `src/features/owner/kit/`: `Panel.tsx`, `PanelRow.tsx`, `MetricStrip.tsx`

**New idea: nesting a theme**

`Sidebar` wraps itself in `<ThemeProvider theme={cravinsOwnerDarkTheme}>`. Every component inside it that calls `useTheme()` gets the dark colours, so the sidebar needs no special colours of its own.

**Also fixed**

Any role could open an owner page that wasn't listed in the nav. Now those pages are closed, apart from More and Help. The fix has a test in `nav.test.ts`. Today only links to pages you're allowed to open.

**Try it yourself**

Change `"sidebar": 256` in `design/tokens.json` to `300`, run `npm run gen:tokens`, and reload.

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
