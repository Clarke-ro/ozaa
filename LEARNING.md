# Learning Cravins

Plain-language notes for Clarke. Newest at the top.

---

## 2026-11-23 · Who may do what, tested for every call

**What we built**

A test that signs in as each of the six staff roles (owner, manager, waiter, kitchen, viewer, scanner) and tries all 75 owner calls. It also signs in as the owner of a different restaurant and tries every call on Mama's Kitchen. It found one crash: editing a custom link with nothing to change was a server error. That's fixed.

**How it works**

```
for each owner call (from api/openapi.yaml)
  for each role, weakest first
    call it → 403?  must match the role table in the test
another venue's owner → every call on Mama's must be 403 or 404
a new call in the contract with no row in the table → the test fails
```

**Files to look at**

- `server/src/routes/ownerRoles.test.ts`: the role table (`ALLOWED`) and the three tests.
- `server/src/routes/ownerGridSetup.ts`: one person per role, a rival owner, and one real order, table, link and so on, so each call reaches its role check.
- `server/src/owner/staff.ts`: `ROLES`, what the server itself enforces.

**New idea: a permission matrix**

Rows are actions, columns are roles, each cell says yes or no. Writing it down in one place makes "can a cook see the sales?" a question you answer by reading a table, not by reading 75 routes.

**Try it yourself**

In `ownerRoles.test.ts`, change `ownerGetPaymentSettings: OWNER` to `DESK`. From `server/`, run `npm test -- src/routes/ownerRoles.test.ts`. It fails and names the exact call and role. Put it back.

## 2026-11-23 · A payment nobody came back for still gets counted

**What we built**

Every minute, the server looks for payments that are still open 5 minutes after they started and asks Paystack how they ended. If Paystack says they succeeded, the order is marked paid, exactly as if the guest had waited.

**How it works**

```
guest approves MoMo → closes the page → webhook lost
        ↓ 5 minutes later
server: "still open?" → asks Paystack → success → order paid (once)
                                      → still waiting → ask again in 5 minutes
                                      → Paystack down → counted, tried again next round
after a day → stop asking
```

**Files to look at**

- `server/src/payments.ts`: `recheckStale`, which reuses the same `ask()` the guest's own check uses.
- `server/src/db/paymentStore.ts`: `stale()`, the query that picks which payments are due.
- `server/src/index.ts`: the one-minute timer, which never runs two rounds at once.

**New idea: reconciliation**

Webhooks are messages, and messages get lost. Reconciliation means regularly comparing your own records with the source of truth (here, Paystack) and fixing the gaps. It's safe to run again and again because saving a success only counts the money once.

**Try it yourself**

In `server/src/routes/paymentRecheck.test.ts`, change the first `tick(4 * MINUTE)` to `tick(6 * MINUTE)`. Run `npm test -- src/routes/paymentRecheck.test.ts` from `server/` and watch it fail: the payment is now old enough to be checked. Put it back.

## 2026-11-22 · A ceiling for the guest page, and a second visit that's nearly free

**What we built**

A test in CI that measures how much JavaScript the guest table home downloads (503 KB gzipped today) and fails above 510 KB. And a rule that lets phones keep the app's code files for a year.

**How it works**

```
first visit:  phone downloads 503 KB of code → keeps it (1 year)
next visit:   index.html is fresh → names the same files → phone already has them → 0 KB
new deploy:   new code means new file names → phone fetches only what changed
```

Every code file has a fingerprint in its name, like `entry-2c6e21….js`. If the code changes, the name changes. So a file with a given name never changes, and a phone can safely keep it.

**Files to look at**

- `e2e/js-budget.spec.ts`: the ceiling test.
- `vercel.json`: the `Cache-Control` rules for `/_expo/static/` and `/assets/`, and the catch-all rewrite that leaves those folders alone.

**New idea: a ceiling, not a target**

About 290 KB of the page is the framework, so we can't reach 350 KB without leaving Expo. A ceiling still helps: nothing can quietly make the page heavier. When a change makes it lighter, lower the number.

**Try it yourself**

In `e2e/js-budget.spec.ts`, set `GUEST_HOME_BUDGET_KB` to 400. Run `EXPO_PUBLIC_API_MODE=mock npx expo export -p web`, then `npx playwright test e2e/js-budget.spec.ts`, and watch it fail with the real number. Put it back to 510.

## 2026-11-18 · Unpaid orders give the dish back

**What we built**

Placing an order still sets the dish aside, so two tables can't both be promised the last portion. Cancel the order, or leave an unpaid guest order unaccepted for 60 minutes, and the dish and the promo use go back. A cash payment, a part payment, an order the kitchen has accepted, and a MoMo prompt that is still open keep the hold. One visit can have 20 unpaid orders waiting, the same burst it could already place. If two orders would get the same number for the day, the server tries the save again and the order still goes through.

**How it works**

```
place order → hold the dish and the promo
  kitchen accepts, or any money is taken → hold stays until staff cancel
  still waiting and unpaid after 60 minutes → cancelled, dish and promo return
  staff cancel before the food is ready → dish and promo return
two orders read the same daily number → try the insert again
```

**Files to look at**

- `server/src/orders/orderInventory.ts`: taking the hold, giving it back, and the 60 minute sweep
- `server/src/orders/orderStore.ts`: saving the order, the visit cap, and cancel
- `server/src/orders/orderNumber.ts`: spotting a duplicate daily number and trying again
- `server/drizzle/0006_order_holds.sql`: the column that records a hold already given back

**New idea: a hold**

A hold is a reservation with an end. The dish count drops when the order is placed, which is what stops an oversell. The count comes back if the order is cancelled or the hold runs out. Once someone pays, or a waiter accepts the order, the food is spoken for and the clock stops.

**Try it yourself**

In `server/src/orders/orderInventory.ts`, change `UNPAID_HOLD_MS` to `60 * 1000`. From `server/`, run `npm test -- src/orders/orderHold.test.ts`. The expiry test fails, because it still waits an hour before it expects the order to drop. Put `60 * 60_000` back when you're done.

---

## 2026-11-18 · Guests can't fake a stamp, a review, or a huge tip

**What we built**

The server now checks four things a phone used to be able to invent. A game stamp needs a paid order. A review needs an order, and each order gets one. A typed tip stops at GHS 10,000. A delivery pin has to be a real place on the map.

**How it works**

```
game score looks possible? → save it → stamp only if this card paid in the last day
review → an order from this visit or table? → already reviewed? return the same one
custom tip over GHS 10,000 → 400, not a crash
delivery pin with latitude 999 → refused
```

**Files to look at**

- `server/src/routes/guestExtras.ts`: reviews, notes and game stamps.
- `src/features/pay/quoteBill.ts`: the tip cap.
- `src/lib/onlineOrdering.ts`: the pin check. The server copy is generated from this file.

**New idea: the phone is not a witness**

The app can show a score or a tip before the server answers, but anyone can send a different number. So the server decides from something the phone can't edit, such as a paid order in the database.

**Try it yourself**

In `src/features/pay/quoteBill.test.ts`, try a custom tip of 1,000,001 pesewas. Run `npx jest src/features/pay/quoteBill.test.ts` and watch it refuse.

---

## 2026-11-18 · Staff phones ask only for what changed

**What we built**

Every owner screen used to download up to 300 orders, with every dish, every 5 seconds. The order page did the same just to show one ticket, so anything older than those 300 could not be opened. The home numbers were added up in JavaScript from two days of orders. Now a poll asks for orders that changed, the order page loads one order, and the home totals are one database query kept for 4 seconds.

**How it works**

```
first open of Orders → newest 300
every 5 seconds → orders with updatedAt at or after the newest one already on screen
order page → GET /owner/orders/{id}
home → one SQL totals row, reused for 4 seconds
```

An older app that does not send `updatedSince` still gets the full page. A guest's write limit follows their visit, not the Wi-Fi address. The address is only a high backstop, so a dining room on one network is not treated as one person.

**Files to look at**

- `server/src/orders/listOrders.ts`: the order list and the change filter.
- `server/src/routes/deskStats.ts`: home totals in SQL.
- `src/features/owner/desk/mergeOrders.ts`: folding a small poll into the list already on screen.

**New idea: a watermark**

A watermark is the newest `updatedAt` the phone has already seen. The next poll sends that time. The server returns orders at that time or later, so a status change is not missed when two orders share a millisecond. The phone remembers order ids it has already chimed for, so a short poll still rings only for a new one.

**Try it yourself**

In `server/src/http/rateLimit.ts`, set `GUEST_SESSION_WRITES_PER_MIN` to 2 and start the server. Place three orders from one table visit. The third is refused. A second table on the same address can still order.

---

## 2026-11-16 · One Payment step, and doors that stay shut

**What we built**

- **One Payment step.** After the order, venues that take payments in the app show **Payment**: MTN MoMo, Telecel, AT, card, and one "not now" option where it makes sense: **Request the bill after your meal** at a table (it calls the waiter for the bill), or **Pay on delivery**. Pickup has no "not now": it's paid in the app.
- **Table pages are for table guests.** Call waiter, the game, reviews, Wi-Fi, loyalty and offers send anyone who came from the venue's link back to its online menu, even if they type the address.

**How it works**

```
order → Continue to payment → Payment: [MoMo | Telecel | AT | Card | not now?]
laterOption(order): table → "Request the bill…", delivery → "Pay on delivery", pickup → none
<TableOnly slug> → no scanned table here? → /slug
```

**Files to look at**

- `src/features/pay/laterOption.ts` and its test.
- `src/features/session/TableOnly.tsx`.
- `e2e/payment-step.spec.ts`.

**New idea: guard the route, not just the button**

Hiding a button isn't enough: anyone can type `/mamas-kitchen/waiter`. Wrapping the page itself (`TableOnly`) closes the door however someone arrives.

**Try it yourself**

Open `/mamas-kitchen/play` in a fresh browser tab: you land on the online menu. Scan a table first (`/mamas-kitchen/t/12`) and the game opens.

---

## 2026-11-16 · White cards on a soft page

**What we built**

Guest pages now sit on the same soft canvas as the owner app, and every card on them is white, so the cards stand out like in Clarke's reference screenshots.

**How it works**

```
theme.bg      → the page (soft canvas)
theme.surface → cards, text boxes, the Wi-Fi box… (white)
theme.white   → buttons on photos (always pure white)
```

`SafeScreen` paints the page with `theme.bg`, so one change moved every guest page. A few boxes had no colour of their own and showed the page through them; they now say `theme.surface`.

**Files to look at**

- `src/ui/theme.tsx`: `bg` is the canvas for guests too.
- `src/ui/Screen.tsx`: the page background.

**New idea: name colours by job, not by look**

`surface` means "a card", `bg` means "the page". Because the code says what each colour is _for_, changing the page from white to canvas was one line, and the cards stayed white without touching them.

**Try it yourself**

In `src/theme/palette.ts`, look at `canvas` in the light colours. Change it slightly, rebuild, and every guest and owner page changes together.

---

## 2026-11-16 · The demo remembers what the owner switched on

**What we built**

- **Mama's Kitchen now has everything on**: Paystack test keys and online ordering (pickup and delivery). It's the venue the app's start page opens, so the whole payment flow shows there. Auntie Akos is now the "pays in person" sample.
- **The demo keeps an owner's settings on the device.** Before, connecting Paystack or turning on online ordering vanished on the next reload, because the demo keeps everything in memory. Now the owner's settings are saved on the phone or in the browser and come back after a reload.

**How it works**

```
owner change (any owner… call) → save settings a moment later (AsyncStorage)
app starts → first call waits → saved settings put back on top of the samples
```

Only settings are kept (venues, menus, payments, offers, tables…), never orders or sign-ins. A version number on the saved copy means new sample data isn't hidden by an old copy.

**Files to look at**

- `src/mocks/demoMemory.ts` and its test.
- `src/mocks/worldSamples.ts`: the three sample venues.
- `README.md`, "Testing payments" and "Expo Go on your phone".

**New idea: per-device storage**

What a phone saves for itself (AsyncStorage, or localStorage in a browser) stays on that phone. That's why an owner's change in one browser doesn't show on another phone: they don't share anything. The real server will be the one shared place, and it replaces this.

**Try it yourself**

In the owner app as Akosua (`0240000005`), connect Paystack with `pk_test_…` and `sk_test_…` keys, reload, then open `/auntie-akos/t/7` and order: **Pay now** is there.

---

## 2026-11-16 · Pay now or pay later

**What we built**

Before sending an order, a guest at a venue that takes payments in the app picks **Pay now** or **Pay later**:

- **At a table:** pay later ("Ask for the bill after your meal") is ticked first, because that's how most people eat out.
- **Pickup or delivery:** pay now is ticked first. Later means "Pay when you collect" or "Pay when it arrives".
- **Pay now** sends the order, then opens the Pay page (MoMo or card, Paystack test).

Online orders pay the whole bill; splitting is only offered at a table. A venue without payments in the app asks nothing.

**How it works**

```
payWhenOptions({ payOnline, fulfilment }) → choices, which one starts ticked, what "later" means
Send → order made → now ? /slug/pay : /slug/status
```

**Files to look at**

- `src/features/orders/payWhen.ts` and its test: the rules.
- `src/features/orders/PayWhenChoice.tsx`: the two cards.
- `e2e/pay-when.spec.ts`: both doors, start to finish.

**New idea: a flaky test**

A test that sometimes passes and sometimes fails is _flaky_. `guest-orders` reloaded the page right after tapping Menu. If the reload was faster than the tap, it reloaded the home page and failed. Waiting for the address to change first made it pass every time.

**Try it yourself**

In `payWhen.ts`, change `input.fulfilment === 'table' ? 'later' : 'now'` to always `'now'`. Run `npx jest payWhen`: the table test fails, because it says the bill should come after the meal.

---

## 2026-11-16 · The table QR that couldn't be scanned

**What we built**

Three fixes so scanning a table always gives the table menu:

- **Table QR codes now open our app.** They held `https://cravins.app/…`, a domain we don't own yet, so scanning one went nowhere. They now use the app's own address (`EXPO_PUBLIC_SITE_URL`, today `https://cravins-app.vercel.app`).
- **The menu link is for browsing when a venue takes no online orders.** No add buttons, no basket. Before, a guest could fill a basket there and only learn at the end that it "takes orders at the table".
- **Phones wait for the saved visit.** On a phone the last visit is read back from secure storage a moment after start. The table page used to save the new table first, and then the old visit (with no table) overwrote it.

**How it works**

```
QR: https://cravins-app.vercel.app/mamas-kitchen/t/12 → table visit → order to table 12
link: https://cravins-app.vercel.app/mamas-kitchen → online ordering on? order : browse only
```

**Files to look at**

- `src/lib/tableLink.ts`: the QR address.
- `src/features/session/useCanOrder.ts`: who may fill a basket.
- `src/features/venue/TableEntryScreen.tsx` and its test: the wait for the saved visit.

**New idea: a race**

Two things that start together and finish in an unknown order are a _race_. Here, "read the saved visit" and "save the new table" raced, and the slower one won. The fix is to make one wait for the other (`hydrated`). The test reproduces the race, and it failed until the fix went in.

**Try it yourself**

In the owner app, open **QR codes and links**, download a table's QR and scan it with your phone camera. It opens that table's page on the live site.

---

## 2026-11-16 · My orders and notifications for online customers

**What we built**

Customers ordering from a venue's link now have:

- **Track strip.** While an order is on its way, the venue page shows "Order #673 · Received — Track ›". Tap it to open the live status page.
- **My orders** (the receipt button on the banner). The order on its way, followed live, and earlier orders from this phone, with their dishes, total, date and last status.
- **Notifications** (the bell on the banner, with a count of new ones). The same page table guests have: order updates as they happen.

No account is needed. The history stays on the phone.

**How it works**

```
order sent (online) → remember(order #, dishes, total, status)   ← kept on this phone
status page / My orders poll the order → setStatus(latest)
```

Only what the customer saw on the order is kept: never their name, phone or address.

**Files to look at**

- `src/features/history/orderHistory.ts` and its test: what's kept, newest first, at most 30.
- `src/features/history/MyOrdersScreen.tsx`, `ActiveOrderStrip.tsx`.
- `src/features/online/OnlineBanner.tsx`: the banner buttons.

**New idea: data minimisation**

Keep only what you need. My orders needs the order number, dishes and total. It doesn't need the customer's name or phone, so we don't save them, and a test checks that.

**Try it yourself**

Place two pickup orders at Bean There in the demo, then open **Your orders**. Reload the page: they're still listed, because they're kept on the device.

---

## 2026-11-16 · The menu was blank on iPhone and Android

**What we built**

The new menu (banner, tabs, offer row, photo cards) now draws on iPhone and Android, the same way it already drew in the browser.

**How it works**

The dish list was a FlashList. It asks the phone "how tall am I?" and only then draws the rows. On iPhone and Android that answer comes back too late, as a height of 0, so it draws nothing. The browser answers immediately, which is why the web looked finished and both phones looked unchanged.

The menu is now an ordinary scroll view. Both phones can measure that. The tab bar is the second child, and the scroll view pins it under the venue's name once the banner has gone.

The phones also load TrueType copies of the same fonts. iPhone and Android cannot read the WOFF2 files the browser uses, so the type never arrived there.

```
web:    FlashList measures the page and draws the dishes
phones: the same question came back as 0, so no dishes
now:    a normal scroll view, which iPhone and Android can measure
```

**Files to look at**

- `src/features/menu/MenuScreen.tsx`: the scroll view and the pinned tab bar.
- `src/theme/fonts.ts`: the TrueType files the phones load. The browser uses `fonts.web.ts`.

**New idea: a measurement that arrives too late**

Some phone APIs call you back later, after your function has already returned. If you read the result on the next line, you still have the empty starting value. FlashList did that with the list's height, so it kept the 0 and never drew.

**Try it yourself**

In `MenuScreen.tsx`, change `const NAME_STRIP = 44` to `64`. Open a venue's own link on your phone: after you scroll, the name has more room and the tabs still sit just under it.

---

## 2026-11-16 · Two doors: the table and the menu link

**What we built**

A venue now has two clear front doors:

- **Table QR** (`/mamas-kitchen/t/12`): the table home with the services list first (Menu, Call waiter, Order status…). It stays on that address.
- **Menu link** (`/bean-there`): online ordering, menu first. The banner keeps share and language; then the name with a small **Info ›**, slim pills for open hours and pickup time, and the menu. Scroll down and the banner slides away; the name and the category tabs stay at the top.

The menu itself now uses cards with the photo on the right and a round **+** on its corner, for both doors. Cards show the name and price; the description is on each dish's own page. The venue picks list or grid in Customise; guests don't switch it.

**Special offers** appear above the menu only while something is on offer: dishes the owner put on sale, and the venue's offers (`GET …/offers`). An offer for a dish shows that dish with the offer's name and a **+**; other offers are short notes.

**How it works**

```
/slug/t/12 → start a table session → table home (services list)
/slug      → end any table visit here → menu with the banner on top → pickup or delivery
```

Opening the menu link after scanning a table ends that table visit in the browser, so an online order never goes to a table you left.

**Files to look at**

- `src/features/online/`: the menu-link page and its banner.
- `src/features/menu/DishRow.tsx`, `MenuControls.tsx`: the new cards and tabs.
- `src/features/session/guestHome.ts`: where "home" is for each kind of guest.
- `e2e/online-ordering.spec.ts`: the three rules, tested.

**New idea: one search button**

The tab bar is one row in the scroll view. The scroll view pins that same row when the banner leaves, so a screen reader still finds one search button.

**Try it yourself**

In `OnlineHero.tsx`, change `const BANNER = 220;` to `300`. Rebuild and open `/bean-there`: a taller banner, and the bar still stops in the right place, because it measures the header instead of guessing.

---

## 2026-11-16 · Real sign-in with Clerk, behind the same door

**What we built**

In a build that talks to the real server, owners and staff now sign in with Clerk: Clerk texts the code and keeps them signed in. The screens look exactly the same. The demo build still uses the code 123456.

**How it works**

```
OwnerLogin → ownerAuth.sendCode / verifyCode   (same calls as before)
   mock build  → mockOwnerAuth (demo code)
   real build  → clerkOwnerAuth → Clerk
every 50 s → a fresh Clerk token, so owner screens never use an expired one
```

Guests never download Clerk. Its code is fetched only when someone opens the owner sign-in page.

**Files to look at**

- `src/lib/auth/clerkOwnerAuth.ts` and its test: Clerk's calls, and its errors turned into ours.
- `src/lib/auth/OwnerClerkProvider.tsx`: starts Clerk around the owner pages only.
- `src/features/session/useFreshOwnerToken.ts`: the 50-second refresh.

**New idea: loading code only when it's needed**

`import('../auth/loadClerk')` with brackets is a _dynamic import_. The web build puts that file in its own download and fetches it only when the line runs. The first try used a plain `require`, and every guest page downloaded Clerk's 70 KB without using it. We measured the pages to catch that.

**Try it yourself**

Run `npx expo export -p web` and look in `dist/_expo/static/js/web/`. With `EXPO_PUBLIC_API_MODE=http`, one of the files contains Clerk; open a guest page and it's never requested.

---

## 2026-11-16 · Guests can pay the card fee (BUILD.md 2.10)

**What we built**

An owner can switch on **Pass fees to customers** (Settings > Integrations) and pick how much of Paystack's 1.95% fee guests pay: 25, 50, 75 or 100%. Guests then see a **Payment fee** line before they pay and on their receipt.

**How it works**

```
owner picks 100% → venue tells guests "feePercent: 100"
Pay screen: share GH₵38 + fee GH₵0.76 = Pay GH₵38.76   (worked out with passedFee)
server quote: the same sum, and that's what Paystack charges
```

The Pay screen works the fee out itself, so the line shows straight away. The server still decides what's charged, so a change in between can never overcharge anyone.

**Files to look at**

- `src/lib/paystackFee.ts`: `passedFee` and `previewFee`, with tests.
- `src/features/owner/screens/integrations/FeePassingCard.tsx`: the owner card.
- `src/features/pay/receiptFigures.ts`: the receipt's sums.

**New idea: one function, two places**

The Pay screen and the server both call `passedFee`. If they each had their own copy of the maths, they could disagree by a pesewa and the guest would pay something different from what they saw. One shared function means they can't disagree.

We also fixed a bug here: the receipt used to count the fee as part of "Your share". A test now proves it doesn't.

**Try it yourself**

In `FeePassingCard.tsx`, add `10` to `SHARES`. Switch it on in the demo and pick 10%: the example under the choices changes to the new fee.

---

## 2026-11-16 · Sign-in moves to Clerk (BUILD.md 5.2, contract first)

**What we built**

Owners and staff will sign in with Clerk, a sign-in service. It texts the 6-digit code and remembers who is signed in. The screens stay ours. This PR changes the contract and the mock; the real Clerk screens come next.

**How it works**

```
phone → Clerk texts a code → code right → Clerk gives a token (lasts about a minute)
app → Cravins server with that token → server checks Clerk's signature → finds the staff record
```

The token only says _who_ you are. _What you may do_ (owner, waiter, kitchen…) still comes from our database.

**Files to look at**

- `src/lib/auth/ownerAuth.ts`: the six things sign-in does, in one type.
- `src/mocks/mockOwnerAuth.ts`: the mock's stand-in for Clerk (code `123456`).
- `src/features/session/ownerRefresh.ts`: gets a fresh token when the server says the old one expired.
- `api/openapi.yaml`: search for `ownerAuth`.

**New idea: a seam**

A seam is a place where you can swap one part for another without touching the rest. The screens call `ownerAuth.sendCode()` and never know whether the mock or Clerk answers. Next PR, Clerk goes in behind the same seam and no screen changes.

**Try it yourself**

In `src/mocks/mockOwnerAuth.ts`, change `fails >= 3` to `fails >= 1`. Run the app, type a wrong code once, then again, and see "too many tries" sooner.

---

## 2026-11-16 · A table for everything (BUILD.md 5.2, step 4)

**What we built**

The database now has a place for everything the app shows: venues, menus, orders, waiter calls, staff, loyalty, reviews, promos and more. 26 new tables, made by one migration.

**How it works**

```
src/db/tables/*.ts  →  npm run db:generate  →  drizzle/0002_everything.sql  →  Heroku runs it on deploy
```

Each table has **columns** for what the server searches or checks (venue, status, money, times), and **JSON** for things that are always read and saved whole (a venue's theme, opening hours, a dish's add-on groups).

**Files to look at**

- `server/src/db/tables/`: one file per area (venues, staff, menu, orders, guests, owner).
- `server/src/db/tables.test.ts`: proves the database itself refuses bad data.

**New idea: let the database say no**

Code has bugs. So the most important rules also live in the database as _checks_: an order can never be paid more than its total, a sale price must be below the normal price, stock can't go below zero. Even if the server code gets it wrong one day, Postgres refuses the write.

**Try it yourself**

In `tables.test.ts`, change `paidPesewas: 5001` to `5000` and run `npm test` in `server/`. That test now fails: paying exactly the total is allowed, so the database no longer says no.

---

## 2026-11-16 · The server's home on Heroku

**What we built**

The server now has a place to live: the Heroku app `cravins-api`. Merging a server change to `main` puts it live by itself.

**How it works**

```
merge to main → GitHub packs server/ → Heroku builds it
→ release phase: npm run db:migrate → new version goes live → /v1/health says ok
```

If a migration fails, Heroku keeps the old version running. Nobody sees a half-changed database.

**Files to look at**

- `server/Procfile`: two lines. `release` runs once per deploy, `web` is the server.
- `.github/workflows/deploy-server.yml`: the deploy steps.
- `server/src/index.ts`: what happens when Heroku asks the server to stop.

**New idea: a graceful shutdown**

Heroku restarts every server once a day and on every deploy. It first sends a polite "please stop" signal (SIGTERM) and waits 30 seconds. Our server stops taking new requests but finishes the ones it's in the middle of, such as a guest's payment, then closes the database. Without this, a payment could be cut off half-way.

**Try it yourself**

Run `npm run dev` in `server/`, open http://localhost:4000/v1/health, then stop the database and refresh. It says `database_unreachable`, and never shows the error text, which could contain the database password.

---

## 2026-11-16 · The server gets a memory

**What we built**

The start of the real backend. The server now keeps payments in a Postgres database instead of in memory. A restart no longer forgets them, and two copies of the server, which Vercel will run, see the same payments.

**How it works**

```text
app ──► POST /v1/payments (Idempotency-Key: abc)
        server ──► INSERT payment … ON CONFLICT (idempotency_key) DO NOTHING
                   new row?  yes ─► ask Paystack to charge, save the answer
                             no  ─► give back the payment already saved for "abc"
```

The database decides which tap was first, so a guest who taps Pay twice is charged once.

**Files to look at**

- `server/src/db/schema.ts`: the payments table.
- `server/drizzle/0000_payments.sql`: the SQL it turns into.
- `server/src/db/paymentStore.ts`: reading and saving payments.
- `server/src/log.ts`: logs that never hold a phone number.

**New idea: a migration**

A migration is a numbered SQL file that changes the database one step, like `0000_payments.sql` creating the payments table. The database remembers which ones it has run. So `npm run db:migrate` brings any copy (your laptop, Supabase) to the same shape, and running it again does nothing.

**Try it yourself**

Run `cd server && npm test`. The payment tests run on PGlite, a real Postgres inside Node. Then open `server/src/db/paymentStore.test.ts` and read "two taps at the same moment still make one payment".

---

## 2026-11-16 · A feature that waits behind a switch

**What we built**

A place for the owner to enter a WhatsApp number for new-order alerts. It lives on Integrations. It stays hidden for now, because nothing can send WhatsApp messages until the real server exists.

**How it works**

```text
WHATSAPP_ALERTS_ENABLED = false ─► "WhatsApp Business · Coming soon"   (what owners see today)
WHATSAPP_ALERTS_ENABLED = true  ─► switch + number field + Save number
                                   saves VenueSettings.whatsappAlerts
```

- The number is the owner's own line, so it sits on the owner-only settings, never on the public venue. A test checks that a guest's venue never contains it.
- Switching alerts off saves straight away. Switching them on waits for a valid number and the Save button.

**Files to look at**

- `src/lib/features.ts`: the switch.
- `src/features/owner/screens/integrations/WhatsAppAlertsCard.tsx`: the card.
- `src/features/owner/screens/integrations/whatsappAlerts.ts`: what gets saved.

**New idea: a feature flag**

A feature flag is a constant that decides whether a finished piece of code shows. It lets us merge work early and keep it dark until the rest is ready. Here the flag is a plain `false`, not a setting, so turning it on is a code change you approve.

**Try it yourself**

Set the flag to `true`, run `npx expo start --web`, sign in, and open Integrations. Type `024 123` and press Save to see the error, then a full number.

---

## 2026-11-16 · Telling a screen reader "on" or "off"

**What we built**

On the web, every switch, checkbox, tab and fold-out row now tells a screen reader its state ("on", "selected", "expanded"). Before, it only said the name.

**How it works**

React Native has two ways to say a control's state:

```text
accessibilityState={{ checked: on }}   phones: yes   web: ignored
aria-checked={on}                      phones: yes   web: yes
```

React Native Web only reads the `aria-*` form, so the 47 places that used `accessibilityState` were silent in the browser. They now use `aria-checked`, `aria-selected`, `aria-expanded`, `aria-disabled` and `aria-busy`.

The accessibility test (`e2e/a11yAudit.ts`) now fails any switch, checkbox, radio or tab that doesn't say its state. Run against the old build, it named every colour swatch and card style on Tables and Branding.

**Files to look at**

- `src/ui/Toggle.tsx`: the switch, with `aria-checked`.
- `e2e/a11yAudit.ts`: the new "state" rule.

**New idea: ARIA**

ARIA attributes are how a web page tells assistive tech what an element is (`role="switch"`) and what state it's in (`aria-checked="true"`). A blind owner needs both to know whether "Call waiter" is on.

**Try it yourself**

In Chrome, open the owner Services page, right-click a switch, choose Inspect, and find `aria-checked`. Flip the switch and watch it change.

---

## 2026-11-16 · When the signal drops

**What we built**

The guest app now copes with a phone that loses its connection, which happens a lot on mobile data.

**How it works**

```text
guest taps Send ─► request ──X reply lost
guest taps again ─► same key ─► server: "I know this one" ─► the first order
```

- **The same key on a retry.** A new helper, `useRetryKey`, keeps one key for as long as the basket stays the same. If the reply is lost and the guest taps again, the server sees the same key and doesn't make a second order. Waiter calls work the same way.
- **Saying so.** The basket and the waiter screen say "You're offline. Connect to send." A send that fails says "Connect and try again" and keeps the basket. The status page says how old the saved status is.
- **Gentler payment checks.** The app checks a MoMo payment every 3 s at first, then slows towards 10 s. It skips checks while the guest is in their MoMo prompt, and checks again the moment they come back.

**Files to look at**

- `src/lib/retryKey.ts`: the key that survives a retry.
- `src/features/pay/paymentWatch.ts`: `pollDelay`.
- `e2e/offline.spec.ts`: a browser test that switches the network off and on.

**New idea: idempotency**

An action is idempotent when doing it twice has the same effect as doing it once. Sending a key with each order lets the server spot the second try and return the first result.

**Try it yourself**

Run `npx playwright test e2e/offline.spec.ts --headed` and watch the basket survive going offline.

---

## 2026-11-16 · A robot that checks every page for accessibility

**What we built**

A test that opens every guest and owner page, in light and dark, and checks three things a screen reader user or a thumb would notice. Then we fixed what it found.

**How it works**

```text
open page → wait for loading → for each button, link and field:
  has a name?            (a screen reader can say it)
  at least 24 px?        (a thumb can hit it)
for each piece of text:
  contrast ≥ 4.5 : 1?    (3 : 1 for big text)
```

It found:

- grey hint text on the warm owner background at 4.35:1. One token, `grey500`, went one step darker and fixed it everywhere.
- a dark-mode bug on owner sign-in
- small tap targets: the photo dots, a switch, the X buttons and two search fields

**Files to look at**

- `e2e/a11yAudit.ts`: the checks, run inside the browser.
- `e2e/a11y.spec.ts`: the list of pages.
- `src/features/owner/OwnerLogin.tsx`: the dark-mode fix.

**New idea: React context reads from above**

`useTheme()` looks _up_ the tree for the nearest `ThemeProvider`. The sign-in page called `useTheme()` and then rendered its own provider _below_ that call, so it read the outer, dark theme. Moving the form into its own component puts the call inside the provider.

**Try it yourself**

Set `grey500` back to `#71717A` in `design/tokens.json`, run `npm run gen:tokens`, rebuild, and run `npx playwright test e2e/a11y.spec.ts`. The test names each hint that fails.

---

## 2026-11-15 · A health check across the app

**What we built**

A clean-up pass across the guest, owner and waiter screens, to get ready for the real server. Nothing new appears on screen. The code is just safer and easier to read.

**How it works**

- **One clock.** Eight screens each ran their own ticking timer. They now share `useNow(ms)`, and it always stops its timer when the screen closes.
- **The demo stays out of real builds.** The sample venues and photos load only when `EXPO_PUBLIC_API_MODE` is `mock`. A real-server build drops them, and its assets shrink from 7.7 MB to 304 KB.
- **A safer server address.** A production build now refuses a local or plain `http://` API address.
- **Named colours.** QR ink and the swatch lists now live in `src/theme/palette.ts`.
- **Tidier folders and smaller files.** Loose owner screens moved into their own folders. `ItemScreen` and `OwnerLogin` were split into smaller files.

```text
mock build → mock client + demo photos
http build → http client only (mock code removed)
```

**Files to look at**

- `src/lib/useNow.ts`: the shared clock.
- `src/lib/api/index.ts`: picks the mock or the real client.
- `src/lib/env.ts`: checks the API address.

**New idea: dead code removal**

Expo writes `EXPO_PUBLIC_*` values into the bundle when it builds. So `MODE === 'http' ? null : require(mock)` becomes `null` in a real build. The bundler sees the `require` can never run and leaves the mock out.

**Try it yourself**

Run `EXPO_PUBLIC_API_MODE=http npx expo export -p web`, then search `dist/` for `ven_mamas`, the sample venue's id. It isn't there, because the fixtures were left out.

---

## 2026-11-15 · Staff, guests and special days on the new API calls

**What we built**

The Staff page now changes a role, picks the tables a waiter looks after, ends a shift, resets a PIN and shows tips today. A customer page can remove a guest who asks to be forgotten. Closed days have names and can open with their own hours. Branding orders the sections on the guest home.

**How it works**

```
contract PR (#110) merged first → new calls in api/openapi.yaml
→ client.ts says what the app may call
→ http*.ts calls the real server · mock*.ts plays the server in the demo
→ screens call api.ownerUpdateStaff(...) and never know which one answered
```

**Files to look at**

- `src/features/owner/screens/staff/useStaffActions.ts`: every staff action in one hook.
- `src/mocks/mockClient.staffGuests.test.ts`: the mock refuses to change the owner's role.
- `src/features/owner/screens/business/hoursForm.ts`: `addClosedDay` with a name and hours.
- `src/features/venue/sectionOrder.ts`: the guest home section order.

**New idea: contract first**

The app and the server agree on a contract (`api/openapi.yaml`) before either is written. That's why the contract went in its own PR first: once it merged, the app, the mock and later the real server could each be built against the same promise.

**Try it yourself**

In `sectionOrder.ts`, call `orderSections(['more'])` in a test. "More" comes first and the other sections keep their usual order.

---

## 2026-11-15 · Owner routes load only their screen

**What we built**

Each owner route now imports the exact screen it renders. The owner feature index keeps only the shared chrome and preferences used by the owner layout. A scoped lint rule lets owner routes enter their own feature, while deep imports into other features remain blocked.

**How it works**

```text
before: Orders route → owner index → every owner screen
after:  Orders route → OrdersScreen
```

The web build can now put each screen in its own route chunk. On the original comparison base, cold JavaScript fell by about 15–17% gzip for Today, Orders, and Scan and stamp. The rebased build keeps those screens in separate chunks.

**Files to look at**

- `src/app/owner/orders.tsx`: names the screen it renders.
- `src/features/owner/index.ts`: exposes only owner-wide layout pieces.
- `eslint.config.js`: keeps sibling feature boundaries in place.

**New idea: a barrel file**

A barrel file re-exports many modules through one `index.ts`. It shortens imports, but importing one screen can make a bundler treat every export as connected. Direct route imports let Metro split those screens.

**Try it yourself**

Compare `src/app/owner/orders.tsx` with `src/app/owner/_layout.tsx`. The route imports one screen directly. The layout uses the small owner entry point because its two imports are shared across every owner page.

---

## 2026-11-15 · Removing code the app no longer uses

**What we built**

The app now has fewer paths to the same behavior. The Loyalty route opens its real screen directly. Three owner components with no callers are gone, along with a Ghana-only money wrapper used only by its own test.

**How it works**

```text
before: route → pass-through wrapper → LoyaltyScreen
after:  route → LoyaltyScreen
```

Deleting an unused file is safer than keeping it "for later". A spare component can quietly drift from the live design and mislead the next person who finds it.

**Files to look at**

- `src/app/owner/loyalty.tsx`: imports the screen it renders.
- `src/features/owner/index.ts`: no longer advertises obsolete screens.
- `src/lib/money.ts`: keeps the currency-aware formatter used by the app.

**New idea: dead code**

Dead code has no runtime caller. It still costs time because searches, reviews, and future changes must decide whether it matters.

**Try it yourself**

Run `git grep OwnerLoyalty -- src` and `git grep formatCedis -- src`. Both commands should return no source reference.

---

## 2026-11-15 · One place to refresh owner data

**What we built**

Owner actions no longer repeat the React Query invalidation call for every affected screen. One helper in `owner/data` performs that repeated operation. Each action still lists the exact data it refreshes, so its effect remains visible where you use it.

**How it works**

```text
move an order
  → invalidateOwnerQueries([Orders, Floor, Today])
  → React Query marks those cached results stale
  → mounted screens fetch current data
```

The helper does not wait for those refetches. The button can finish immediately while React Query updates the screens.

**Files to look at**

- `src/features/owner/data/invalidateOwnerQueries.ts`: the shared cache operation.
- `src/features/owner/screens/orders/useOrderMove.ts`: the order-specific list.
- `src/features/owner/screens/calls/useWaiterCalls.ts`: the call-specific list.

**New idea: cache invalidation**

A cache keeps an earlier server answer. After a change, invalidation marks related answers as old so React Query asks for fresh ones.

**Try it yourself**

Move an order to its next stage. Open Orders, Floor, and Today and check that all three agree.

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

A venue-branded wallet card (`WalletCard.tsx`) with the Cravins scan-frame watermark, Bronze/Silver/Gold tiers, stamps or spend points, a rewards catalogue, and an owner Loyalty screen (`screens/loyalty/LoyaltyScreen.tsx`) to set up the programme and confirm guest claim codes.

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
- `src/features/owner/screens/loyalty/LoyaltyScreen.tsx`: staff code confirmation, programme setup, and members list.

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

## 2026-11-16 · The server takes guest orders

**What we built**

The server now does the guest side of the app for real: scanning a table, the menu, Wi-Fi, offers, placing an order and getting a bill to pay. Until now, the app's built-in demo did all of this inside your browser.

**How it works**

```
scan table 12 → POST /guest-sessions → signed token "gst.…" (4 hours)
add dishes   → POST /orders + token  → server prices it, takes stock, saves it → order #7
pay          → POST /orders/…/bill   → a quote the payment will use
```

The server never trusts the app's total. It looks up each dish, applies sale prices, add-ons, the best promo, tax and the delivery fee itself. It uses the same rules as the app: a script copies them into `server/src/shared/`.

**Files to look at**

- `server/src/routes/guest.ts`: the routes.
- `server/src/orders/priceOrder.ts` and `orderStore.ts`: pricing, then saving in one go.
- `server/src/guest/token.ts`: the signed token.
- `server/src/routes/guest.test.ts`: the tests that check replies against the contract.

**New idea: a signed token instead of a login**

Guests don't sign in. The token says "session X, venue Y, table 12, until 4 pm", followed by a signature made with a secret only the server knows. If anyone changes a letter, the signature no longer matches and the server says 401. So the server needs no session table and stores nothing personal.

**Try it yourself**

In `guest.test.ts`, set a dish's `stockCount` to 1, then order 2 of it. Watch the server say `item_sold_out`. Then order 1, and see the menu mark it unavailable.

## 2026-11-16 · Payments land in each restaurant's own Paystack

**What we built**

A guest's payment now goes to the Paystack account of the restaurant they're eating at. The server finds that restaurant's key and charges the bill the server itself worked out. When Paystack says "success", the order shows as paid.

**How it works**

```
guest → POST /orders/…/bill → quote (share + tip + fee), made by the server
guest → POST /payments {quoteId} → server opens Mama's sealed key → Paystack charges
Paystack "success" → payment succeeded → order paid, lines ticked (once only)
```

Each restaurant's secret key is stored **sealed**. The server locks it with `ENCRYPTION_KEY`, which lives only in Heroku's settings. Someone with a copy of the database sees `v1.Xk3…` and nothing useful.

**Files to look at**

- `server/src/secrets/sealed.ts`: sealing and opening a key.
- `server/src/venues/venuePaystack.ts`: finds the right restaurant's key.
- `server/src/routes/payments.ts`: the payment routes and the webhook.
- `server/src/db/paymentStore.ts`: `save`, which pays the order exactly once.

**New idea: authenticated encryption**

AES-GCM doesn't only scramble the key. It adds a tag, like a wax seal. If anyone changes even one letter of the stored value, opening it fails loudly instead of giving back a wrong key. The test `a changed letter or the wrong key is refused` shows it.

**Try it yourself**

In `payments.test.ts`, sign a webhook with `sk_test_someoneelse` instead of the venue's key, and watch the server refuse it with 401.

## 2026-11-16 · Owners sign in to the real server

**What we built**

The server now knows who is using the restaurant app and what they're allowed to do. An owner can connect Paystack, set cash, bank or MoMo details, and run the orders desk. Kitchen and waiters only get the buttons their job needs.

**How it works**

```
app signs in with Clerk (SMS code) → Clerk gives a short token
app → GET /me with the token → server asks Clerk "whose token, which phone?"
server finds the staff row with that phone → "Clarke, owner at 3 venues"
every /owner call → "is this person owner/kitchen/waiter at THIS venue?"
```

Clerk only answers "who is this". Cravins keeps the answer to "what may they do" in its own database, so an owner can add or remove staff without touching Clerk.

**Files to look at**

- `server/src/owner/clerk.ts`: checks the token with Clerk.
- `server/src/owner/staff.ts`: finds the person, and `ROLES`, the who-may-do-what list.
- `server/src/routes/owner.ts`: the routes.
- `server/src/routes/owner.test.ts`: a fake Clerk signs in an owner, a waiter and a cook.

**New idea: authentication vs authorisation**

Authentication is proving who you are (Clerk's SMS code). Authorisation is deciding what you may do (our roles). Keeping them apart means a kitchen phone signed in as "Kofi" still can't change where the money goes.

**Try it yourself**

In `owner.test.ts`, let the waiter move an order to `preparing`. The test fails with `illegal_move`, because waiters only serve. Find the rule in `src/features/orders/orderMachine.ts`.

## 2026-11-16 · Two apps: the real one and the demo

**What we built**

Cravins now runs as two web builds of the same code:

- **The real app** (`cravins-app.vercel.app`) talks to the server on Heroku. Real orders, real Paystack test payments, real owner sign-in.
- **The demo** (`cravins-demo.vercel.app`) runs on the built-in mock with sample restaurants. Nothing in it reaches the server.

The landing site's **Log in** and **Get started** open the real app. **Try it**, the sample menus and the QR card open the demo. The real app's start page sends "Open Mama's Kitchen" to the demo too.

**How it works**

```
same code ──build with EXPO_PUBLIC_API_MODE=http──▶ cravins-app  (real server)
          └─build with EXPO_PUBLIC_API_MODE=mock──▶ cravins-demo (sample data)
landing: PUBLIC_APP_URL → Log in    PUBLIC_DEMO_URL → Try it
```

**Files to look at**

- `landing/src/content/links.ts`: which button goes where.
- `src/app/index.tsx`: the app's start page.
- `src/lib/env.ts`: `EXPO_PUBLIC_DEMO_URL`.

**New idea: build-time settings**

One codebase, two behaviours, chosen when the site is built, not when it runs. Vercel bakes each project's settings into its own copy, so the demo build doesn't even contain the code that talks to the server.

**Try it yourself**

In `landing/`, run `PUBLIC_DEMO_URL=https://example.com npm run build` and open `dist/demo/index.html`. The sample menus now point at example.com, while Log in still points at the app.

## 2026-11-16 · Waiter calls on the real server

**What we built**

A guest at a table taps "Call the waiter". The call shows up in the restaurant app's queue. A waiter taps "On my way", and the guest's phone shows the waiter's first name. A reply such as "Coming in 2 min" finishes the call. A snooze hides it from the queue for a few minutes.

**How it works**

```
guest  → POST /waiter-calls {reason}           → one open call per table
staff  → GET  /owner/venues/…/waiter-calls     → the queue (snoozed ones hidden)
staff  → PATCH /owner/waiter-calls/… "On my way" → guest sees "Kwesi is on the way"
```

Calling twice from the same table changes the reason of the open call, so an impatient guest can't fill the queue.

**Files to look at**

- `server/src/routes/waiter.ts`: the four routes.
- `src/features/waiter/callUpdate.ts`: the rules, shared by the app and the server.
- `server/src/routes/waiter.test.ts`: a table, a waiter, a cook and a snooze.

**New idea: a guarded update**

When two waiters tap "On my way" at the same moment, only one should win. The update says "change it only if it's still open". The second tap finds it already acknowledged and gets a polite 409.

**Try it yourself**

In `waiter.test.ts`, snooze a call for 2 minutes, then move the clock only 1 minute with `tick(60_000)`. The queue stays empty.

## 2026-11-16 · The menu editor saves to the real server

**What we built**

Owners and managers can add, rename, hide and delete menu sections. They can add dishes and change prices, sale prices, stock and labels. Guests see each change on their next menu load.

**How it works**

```
owner app → POST/PATCH/DELETE /owner/venues/{id}/menu/…   (owner or manager only)
server checks: sale price below price, min ≤ max, section is on this menu
guest app → GET /venues/{slug}/menu → the same rows
```

A deleted dish isn't wiped. It gets a "deleted at" time, because past orders and the Sales page still name it. A section can only be deleted once it has no dishes left, so nothing vanishes from the menu by surprise.

**Files to look at**

- `server/src/routes/ownerMenu.ts`: the routes and the checks.
- `server/src/routes/ownerMenu.test.ts`: a dish goes from new, to on sale, to sold out, to deleted.

**New idea: soft delete**

Instead of removing a row, we mark it deleted and leave it out of every list. The history stays correct, and "undo" stays possible later.

**Try it yourself**

In `ownerMenu.test.ts`, give a dish a sale price equal to its price. The server refuses with 422. Then read `checkItem` to see why.

**Not yet:** dish photos. Uploads need a storage service (BUILD.md section 17). Until then, an edit keeps the dish's current photo.

## 2026-11-16 · Dish photos go to Supabase Storage

**What we built**

Owners can put a photo on a dish. The photo goes straight from the owner's browser to Supabase Storage. The server only hands out a one-time upload address and checks the result.

**How it works**

```
app → POST /owner/venues/{id}/media {dish_photo, image/jpeg, size}
server → asks Supabase for a signed upload URL (2 hours, one file) → app
app → PUT photo to that URL                       (straight to Supabase)
app → PATCH dish {photoMediaId}
server → file arrived? read width × height → save the public URL on the dish
```

The secret key that signs uploads stays on the server. The app only ever gets a link that works for one file, for a short time.

**Files to look at**

- `server/src/media/storage.ts`: talks to Supabase.
- `server/src/media/images.ts`: turns a media id into a photo with its size.
- `server/src/routes/media.ts`: the upload route.

**New idea: signed upload URLs**

Instead of passing photos through our server, the server signs a permission slip for one file. Big files skip our server, and the storage key never reaches a phone.

**Try it yourself**

In `media.test.ts`, save a dish with a `photoMediaId` before calling `upload(...)`. The server says `media_not_found`: it never shows a photo that didn't arrive.

## 2026-11-16 · Tables and QR codes on the real server

**What we built**

Owners see their tables, add new ones (like "13" or "Patio-1"), and download each table's QR code. Each code opens that table's page on the real app, so a guest who scans it starts a table visit.

**How it works**

```
owner → POST /owner/venues/{id}/tables {codes: ["13","Patio-1"]}
server → saves the new ones, keeps any that exist (safe to repeat)
owner → GET …/tables/{tableId}/qr → SVG of https://cravins-app.vercel.app/mamas-kitchen/t/13
```

The server draws the QR with the same code as the app (`src/lib/qrSvg.ts`, shared by the sync script), so the sticker and the screen always match.

**Files to look at**

- `server/src/routes/ownerTables.ts`
- `src/lib/tableLink.ts`: the address a QR holds.

**New idea: natural sort**

Plain text sorting puts "10" before "2". `localeCompare(…, { numeric: true })` compares the numbers inside the text, so tables list as 1, 2 … 10.

**Try it yourself**

In a Node prompt, sort `['10', '2', '1']` with and without `{ numeric: true }`, and compare the results.

## 2026-11-17 · Venue settings on the real server

**What we built**

The Customise screens now save to the real server: the venue name, tagline, hours, location, Wi-Fi, tax, the WhatsApp alerts number, the logo and banner, the brand colour and font, and which services guests see.

**How it works**

```
owner → PATCH /owner/venues/{id} {name, wifi, logoMediaId…}   (owner or manager)
owner → PUT …/theme {accent "#FFE600"} → server runs deriveTheme → safe colours
owner → PUT …/services {services, game}
guest → GET /venues/{slug} → only the public parts (no TIN, no alerts number)
```

**Files to look at**

- `server/src/routes/ownerVenue.ts`: the routes.
- `server/src/venues/venueSettings.ts`: what the owner sees, and the theme.
- `src/features/theming/deriveTheme.ts`: the colour rules, shared by the app and the server.

**New idea: never trust the client with safety rules**

The app already darkens a too-light colour before showing it. The server runs the same check again, because a guest's phone should never get white text on yellow, whatever app version the owner used.

**Try it yourself**

In `ownerVenue.test.ts`, change the accent to `#B5432A` (a dark red). Then look at `derived.fill`: the server keeps it as it is, because it already passes contrast.

## 2026-11-17 · Inviting staff on the real server

**What we built**

An owner invites a teammate with their name, phone, email and role. The server creates their Clerk sign-in at once, so they can sign in with a code sent to their email. On their first sign-in they become an active member of the team. The owner can change someone's role or tables, reset their PIN, sign them out everywhere, or remove them.

**How it works**

```
owner → POST /owner/venues/{id}/staff {Esi, phone, esi@…, waiter}
server → staff record + "invited" membership + Clerk user for esi@…
Esi → signs in with the email code → GET /me → membership turns "active"
owner → DELETE …/staff/{id} → "removed" + Clerk signs her out on every device
```

**Files to look at**

- `server/src/routes/ownerStaff.ts`: the routes.
- `server/src/owner/clerkAdmin.ts`: the two Clerk calls (make a user, sign them out).

**New idea: do the risky step first**

The invite calls Clerk before saving the membership. If Clerk fails, nothing is half done, so the owner can simply try again.

**Try it yourself**

In `ownerStaff.test.ts`, try to change the owner's role. The server answers `owner_role` (409). Only support can add or change an owner, because owners decide where the money goes.

## 2026-11-17 · The Today page, the floor and Sales on real data

**What we built**

The owner's Today page, the floor map and the Sales page now read real orders, waiter calls, reviews and visits from the database.

**How it works**

```
guest scans → a "visit" row (venue, table, time; nothing personal)
Today  → sales taken today, live orders, open tables, calls, sold-out alerts, visitors
Floor  → each table's status worked out from its latest order and any open call
Sales  → totals, top dishes, by source and day, compared with the same span before
```

Nothing about a table's status is stored. It's worked out from orders and calls each time (the shared `deriveFloor`), so a table can never be marked "free" while it still has an unpaid bill.

**Files to look at**

- `server/src/routes/ownerDesk.ts`
- `src/features/owner/desk/daySummary.ts`, `src/features/owner/floor/floorStatus.ts`, `src/lib/sales.ts`: the shared rules.

**New idea: derived state**

If two stored facts can disagree, they eventually will. Keeping only orders and calls, and working out the table status from them, removes a whole class of bugs.

**Try it yourself**

In `ownerDesk.test.ts`, mark the order paid and served, then read the floor. Table 4 goes back to free on its own.

## 2026-11-17 · Reviews, guest notes and the game on the real server

**What we built**

- **Reviews:** guests leave stars, highlights and a few words. Owners see them and can reply. Every guest gets the same thank-you, whatever their stars.
- **Private notes:** a guest can send the manager a note, with a phone number only if they choose. The server reads its mood, so unhappy notes stand out, and keeps it hidden for two hours so it can't be matched to whoever just sat down. "Ask about my feedback" sums the notes up.
- **The game:** scores go on this week's top-5 board. A score that came faster than a person can tap is refused.

**How it works**

```
note "Food was cold, waiter was rude" → mood: negative (score 1) → visible after 2 h
game score 40 in 1 second → 40 taps × 0.2 s = 8 s minimum → refused
```

**Files to look at**

- `server/src/routes/guestExtras.ts`: reviews, notes, game.
- `server/src/routes/ownerFeedback.ts`: the owner side.
- `server/src/feedback/mood.ts`: the mood word lists.

**New idea: privacy by delay**

A note that appears the moment it's sent points straight at the one table that just left. Holding it back two hours keeps the guest anonymous, with no extra data needed.

**Try it yourself**

In `mood.test.ts`, try "not bad at all". Then look at how "not" flips the next word.

**Not yet:** a game stamp needs a loyalty card, and loyalty waits for the SMS provider.

## 2026-11-17 · Guests prove their phone with an SMS code

**What we built**

Before a guest joins a loyalty card, they prove the phone number is theirs. The server texts a 6-digit code through Arkesel, the guest types it in, and the app gets a loyalty token.

**How it works**

```
guest → POST /auth/otp/request {+233…}  → Arkesel texts "123456 is your Cravins code"
guest → POST /auth/otp/verify {code}    → loyalty token (sealed, 30 days)
```

- The database never holds the phone or the code, only scrambled fingerprints (HMAC hashes) of them.
- Every number gets the same answer, so nobody can use the screen to find out who is a member.
- SMS costs money and anyone can ask, so there are limits: 30 s between texts, 5 per phone and 10 per internet address per hour, 5 guesses per code, and a daily total for all of Cravins.

**Files to look at**

- `server/src/routes/otp.ts`: request and verify.
- `server/src/sms/arkesel.ts`: talks to Arkesel.
- `server/src/guest/loyaltyToken.ts`: the sealed token.

**New idea: rate limiting**

A rate limit counts recent tries and says "wait" past a number. Without one, a bot could send thousands of texts on Cravins's bill.

**Try it yourself**

In `otp.test.ts`, change `PER_PHONE_PER_HOUR` to 2 in `otp.ts` and rerun the tests. Watch which test notices.

## 2026-11-17 · The guest loyalty card on the real server

**What we built**

A guest who proved their phone by SMS can join a venue's loyalty card (consent recorded), see their stamps and rewards, open a reward code for staff, earn a stamp by winning the game, and leave, which deletes their card.

**How it works**

```
PUT  /venues/{slug}/loyalty/me   join (consent + text version saved, Act 843)
GET  /venues/{slug}/loyalty/me   the card: programme, stamps, history
POST …/loyalty/me/redeem         a 6-letter code; only staff confirming it takes stamps off
POST …/game/scores + X-Loyalty-Token → a win can add one stamp a day
DELETE /venues/{slug}/loyalty/me leave: their card and history are deleted
```

The rules are the app's own (`src/features/loyalty/facts.ts`). The server loads one member, runs `apply`, and saves only what changed. The ledger only ever grows: stamps are never edited, a balance is always the sum of the facts.

**Files to look at**

- `server/src/loyalty/store.ts`: load, step, save.
- `server/src/routes/loyalty.ts`: the guest routes.

**New idea: an append-only ledger**

Like a bank statement, nothing is overwritten. "4 stamps" is worked out from four "earn" lines. Mistakes are fixed by adding a line, so the history always explains the balance.

**Try it yourself**

In `loyalty.test.ts`, play the game three times in one day after joining. Only the first win adds a stamp: find the "once a day" rule in `facts.ts`.

## 2026-11-17 · The owner's loyalty desk on the real server

**What we built**

Owners and staff can now run loyalty for real: set up the programme (rewards, tiers, the card's look), scan a guest's card to add a stamp or give a reward, confirm a guest's 6-letter code, look up members, see who stamped what today, read analytics, and erase a member on request.

**How it works**

```
staff scans card → stamp (once an hour per guest) → "Esi: 4 stamps, reward unlocked!"
staff taps Redeem → the cheapest reward they can afford, claimed and confirmed in one go
guest shows code ABC123 → staff confirm → stamps come off (only staff can do this)
```

Every stamp records who gave it, so "Today" on Scan and stamp is just the ledger lines with a name, newest first.

**Files to look at**

- `server/src/routes/ownerLoyalty.ts`: the routes.
- `server/src/loyalty/counter.ts`: stamp and reward at the counter.
- `server/src/loyalty/desk.ts`: customers, analytics, the scan log.

**New idea: idempotent actions**

Confirming the same code twice doesn't take stamps off twice. The rule sees the code is already confirmed and just shows the card again. Network retries and double taps become harmless.

**Try it yourself**

In `ownerLoyalty.test.ts`, remove one of the `tick(61 * 60_000)` lines. A stamp gets refused with `cooldownViolated: true`.

**Not yet:** the automatic stamp when an order is paid. That needs the order to know whose card it is.

## 2026-11-17 · Paying for an order stamps the loyalty card

**What we built**

A guest with a loyalty card who orders and pays now gets a stamp automatically, whether they pay online or staff mark it paid in cash. The owner can switch this off in the loyalty settings.

**How it works**

```
order placed with X-Loyalty-Token → order keeps the card's id (never the phone)
order fully paid (Paystack success or "Mark paid") → one stamp, same transaction
paid twice / webhook + verify → still one stamp (keyed by order id)
member erased → their old orders lose the link, but stay for tax
```

**Files to look at**

- `server/src/loyalty/paidOrder.ts`: link at order time, stamp at payment time.
- `server/drizzle/0004_order_loyalty.sql`: the new column.

**New idea: doing two things in one transaction**

Marking the order paid and adding the stamp happen together. If one fails, neither is saved, so you never get a paid order with a missing stamp, or a stamp for an unpaid order.

**Try it yourself**

In `paidOrder.test.ts`, mark the same order paid three times and check the stamps stay at 1.

## 2026-11-17 · Promos and coupons on the real server

**What we built**

Owners and managers create promos (percent off, an amount off, or a free dish), with an optional coupon code, days, hours, dates, a channel (table, online or both) and a usage limit. The order a guest places uses the best one that applies. Each use is counted, so a "first 50 orders" promo ends by itself.

**How it works**

```
owner → POST /owner/venues/{id}/promos {Ten off, 10%, code JOLLOF10, limit 1}
guest → order with promoCode "jollof10" → server applies it, counts 1 use, adds the discount given
next guest → same code → "That code doesn't work right now" (limit reached → ended)
```

**Files to look at**

- `server/src/routes/ownerPromos.ts`: the routes and the checks.
- `src/lib/promos.ts`: when a promo is running, and which one is best (shared).
- `server/src/orders/orderStore.ts`: counting a use when the order is saved.

**New idea: counting inside the same transaction**

The order and the promo's use count are saved together. Two guests racing for the last use can't both get it without both being counted.

**Try it yourself**

In `ownerPromos.test.ts`, change `usageLimit` to 2 and place a third order. It's refused only on the third.

## 2026-11-17 · Notifications on the real server

**What we built**

The bell in the owner app now shows real events from the last day: new orders, waiter calls, bill requests, guest notes and reviews. Each person has their own read state. The kitchen only sees orders, waiters also see calls and bills, and owners see everything.

**How it works**

```
GET /owner/venues/{id}/notifications → built fresh from orders, calls, notes, reviews (last 24 h)
POST …/notifications/read {ids}      → saved for this person only
```

The feed isn't stored. It's worked out from the same rows the queues use (the shared `notificationFeed`), so the bell and the orders board can never disagree. Only "who has read what" is saved.

**Files to look at**

- `server/src/routes/ownerNotifications.ts`
- `src/lib/notificationFeed.ts`: the shared feed builder.

**New idea: per-user state on shared data**

One list, many readers. The list is the same for everyone; the "read" ticks live in a separate table keyed by person, so Kwesi reading a call doesn't hide it from Ama.

**Try it yourself**

In `ownerNotifications.test.ts`, have the kitchen mark everything read, then check the owner's unread count. It doesn't change.

## 2026-11-17 · The last owner screens on the real server

**What we built**

The owner app's remaining screens now save to the real server:

- **Staff take orders:** for a table, at the counter, or a phone pickup with the customer's details.
- **Insights:** sales, top dishes, peak hours, visits to orders, guest mood, repeat guests.
- **Business and locations:** the business profile, and adding a location (a new venue that starts unpublished, with your look and hours to edit).
- **Scanner devices:** pair a door or counter phone with a 6-digit code, list devices, revoke one.
- **Your profile:** name, email, photo, preferences. Saving one switch keeps the others.
- **Deleting an account:** staff can delete theirs. An owner is sent to support, because an owner's account holds venues and tax records.

It also fixes a bug: archiving a guest note used the wrong method (POST instead of PATCH), so the app's Archive button failed on the real server.

**Files to look at**

- `server/src/routes/ownerOrderEntry.ts`, `ownerBusiness.ts`, `me.ts`
- `server/src/routes/ownerRemaining.test.ts`: one test per screen.

**New idea: defaults at read time**

A profile saves only what the person changed. The server fills in the rest from defaults every time it answers. A new setting added later works for everyone, without changing anyone's saved data.

**Try it yourself**

In `ownerRemaining.test.ts`, turn off the "order" notification in a profile. Then check that the other four switches still come back as true.

## 2026-11-17 · Tap to open: NFC tags on table cards

**What we built**

A guest can now tap their phone on the table card instead of scanning. On the Tables page, each table has an NFC button. A switch, "Cards with an NFC tag", changes the printed words to "Scan or tap".

**How it works**

An NFC sticker can hold a web link, just like a QR code. We write the same table link to both:

```
QR code  ─┐
          ├─► https://…/mamas-kitchen/t/12 ─► the table's menu
NFC tag  ─┘
```

Phones read link tags on their own (iPhone XS and newer, and most Android phones), so the guest app needed no change. Writing a tag is the new part. Chrome on Android can do it from a web page with `NDEFReader`. Safari can't, so on an iPhone or a computer the sheet shows the link to copy into a free app such as NFC Tools.

**Files to look at**

- `src/features/owner/screens/tables/nfc.ts` and `nfc.test.ts`: writing the tag, and naming why it failed.
- `NfcTagSheet.tsx`: the sheet.
- `e2e/nfc-tags.spec.ts`: a fake `NDEFReader` records what would be written.

**New idea: feature detection**

We don't ask "is this Android?". We ask "does this browser have `NDEFReader`?". The answer stays right when Safari adds NFC one day, or a phone has NFC switched off.

**Try it yourself**

In `nfc.test.ts`, make the fake reader throw a `NetworkError`. What does `writeNfcTag` return, and what does the sheet say then?

## 2026-11-17 · Sign-in that says what went wrong

**What we built**

Two fixes to owner sign-in:

- **Leftover sessions:** sometimes Clerk accepted the code but a later step failed. Clerk then kept that phone signed in, and refused every new "Send code". Now sign-in clears a leftover session first.
- **Clear errors:** the screen used to say "Something went wrong" for every failure. Now it names the problem (wrong code, no connection, email not on a venue, sign-in not answering) and shows a short reference such as `me-500-internal`.

**How it works**

```
Send code ─► Clerk checks code ─► Clerk token ─► server /me ─► Today
  "send"          "code"            "token"         "me"
```

The screen tracks which step it is on. If a step fails after Clerk took the code, it signs out of Clerk and goes back to the email step, because that code can't be used twice.

**Files to look at**

- `src/features/owner/loginError.ts` and its test
- `src/lib/auth/clerkOwnerAuth.ts`: `sendCode`
- `src/features/owner/OwnerLogin.tsx`

**New idea: errors people can act on**

One message for every error is easy to write and impossible to fix. A message per cause tells the person what to do. The reference tells the developer where to look.

**Try it yourself**

Turn your phone's Wi-Fi and data off, then tap Send code. Which message and reference do you see?

## 2026-11-17 · Accept before cooking

**What we built**

A new order now has to be accepted before the kitchen can start it:

```
New ──Accept order──► Accepted ──Start cooking──► Cooking ──► Ready ──► Served
```

- **Staff:** a new ticket shows **Accept order**. Once accepted, it stays under New, marked "· Accepted", and its button becomes **Start cooking**. Waiters, the kitchen, managers and owners can all accept. The Orders badge counts only orders nobody has accepted yet.
- **Guests:** the timeline reads Accepted · Being prepared · Ready · Served. Until someone accepts, the first step says "Waiting for the restaurant to accept", with the time the order was sent. The guest also gets an "Order accepted" notification.

The same PR also makes Quick actions and All tables two columns on phones, removes the circle behind the back arrow, and gives the Sales card a soft orange tint.

**Files to look at**

- `api/openapi.yaml`: `OrderStatus` gains `accepted`.
- `src/features/orders/orderMachine.ts` and its test: the moves, who may make them, and `moveFor`.
- `src/features/orders/StatusTimeline.tsx`: the guest's steps.
- `server/src/routes/owner.ts`: the server uses the same rules.

**New idea: one source of truth for the rules**

The demo and the real server both used to turn "set it to preparing" into the move "start", each in its own code. Now both call `moveFor()` from the shared order machine. A new step is added in one place, and the demo and the server can't disagree.

**Try it yourself**

In `orderMachine.test.ts`, check that a waiter can accept an order but can't start cooking it.

## 2026-11-17 · Text that shrinks to fit

**What we built**

Stat labels such as "Pending orders" used to break onto two lines, or end in "…", on phones. Now they stay on one line and get a little smaller when there isn't room. The same goes for Quick actions labels, the big numbers on the stat cards, the trend lines on Sales, and settings rows like "Stamps on a full card".

Also in this change:

- Quick actions are three across on phones again.
- The Sales card is about 0.25 cm wider, on phones only.
- The last row of Quick actions now lines up with the rows above it.

**How it works**

```
measure the words ──► fits? ──yes──► keep the size
                         │
                         no ──► size × room ÷ words (never below 9–10 px)
```

React Native has `adjustsFontSizeToFit`, but browsers ignore it. `FitText` uses it on phones. On the web, it measures the words with `document.createRange()`, which gives the exact width, and sets a smaller size.

**Files to look at**

- `src/ui/fitText.ts` and its test: the sizing rule.
- `src/ui/FitText.tsx`: the component.

**New idea: rounding bugs**

`scrollWidth` rounds to whole pixels. Text 105.4 px wide in a 105 px box looked like it fit, but the browser still cut it off. Measuring the exact width fixed it.

**Try it yourself**

Open Sales in a narrow browser window and drag the window wider. The labels grow back to full size.

## 2026-11-17 · The guest timeline keeps pace

**What we built**

The guest's timeline was always one step behind the owner app. A step only got its tick once the _next_ step started, so Served never ticked at all. Now a step is ticked the moment staff mark it, and the step after it is highlighted.

Pickup and delivery orders end as **Picked up** or **Delivered** instead of Served. The wording changes on:

- the guest timeline and status title
- My orders and the guest's notifications
- the owner's button ("Mark picked up" / "Mark delivered")
- the owner's order page

The API status is still `served`; only the words change. Drivers and the delivery map come later.

**How it works**

```
owner marks:   Accept   Start cooking   Mark ready   Mark served
guest ticks:   ✓ Accepted ✓ Being prepared ✓ Ready     ✓ Served / Picked up / Delivered
```

**Files to look at**

- `src/lib/orderTimeline.ts` and its test: `timelineSteps`, `finishWord`, `statusKey`.

**New idea: "done" vs "current"**

The old timeline treated the status as "the step we're on", so the step wasn't done yet. But a status means "staff have done this", so the step is done. Picking the right meaning fixed the off-by-one.

**Try it yourself**

In `orderTimeline.test.ts`, check what `timelineSteps('ready')` returns.

## 2026-11-17 · A security audit, and the one real hole it found

**What we built**

I read every server route, the payment flow, uploads, the hosting config and the workflows, and searched all of git history for leaked keys. The full report is `docs/SECURITY_AUDIT_2026-11-17.md`.

One real hole turned up, now fixed. An owner could invite someone else's phone number with _their own_ email, then sign in as that person. Now an invite only adds an email for someone who works nowhere but the inviting owner's venues.

The audit also added rate limits for guests, security headers, a request size cap, a fix for a payment status race, and patched packages.

**How it works**

```
request ─► HTTPS? ─► size ok? ─► under the rate limit? ─► route ─► "is this your venue?"
```

Each layer refuses early, so a bad request never reaches the database.

**Files to look at**

- `server/src/routes/ownerStaff.ts`: the invite rule, plus its test in `ownerStaff.test.ts`.
- `server/src/http/rateLimit.ts`: a sliding-window counter.
- `server/src/hardening.test.ts`: headers, HTTPS, size cap and rate limits.

**New idea: test the attack, not just the feature**

The invite test plays the attacker: a second owner tries the trick. It failed before the fix (the server said 201) and passes after (409). A test that only checks the happy path would never have caught this.

**Try it yourself**

In `rateLimit.test.ts`, change the limit to 2 and watch which assertions fail.

## 2026-11-17 · Indexes: how the database finds rows fast

**What we built**

Migration `0005` adds 17 indexes, a rule that two staff can't share an email, and a rule that every payment belongs to a real order. Owner requests also stopped writing to the database on every poll.

**How it works**

Without an index, finding an order's lines means reading _every_ line in the table. With an index on `order_lines(order_id)`, Postgres jumps straight to them, like a book's index instead of reading every page.

```
no index:   scan 1, 2, 3 … 90,000 lines → keep the 3 that match
index:      look up "ord_42" → the 3 lines
```

The screens that poll every few seconds (Orders, Today, the call queue, the guest menu) each got the index that matches their query.

**Files to look at**

- `server/drizzle/0005_indexes_and_integrity.sql`: the migration.
- `server/src/db/tables/*.ts`: each `index(...)` has a comment saying which screen it's for.
- `server/src/db/tables.test.ts`: the database refuses a duplicate email or an orphan payment.

**New idea: let the database enforce the rule**

The app already checked for duplicate emails. But two invites at the exact same moment could both pass that check. A unique index can't be raced: the second insert simply fails.

**Try it yourself**

In Supabase's SQL editor, run `explain select * from order_lines where order_id = 'x';` before and after the deploy. Look for "Index Scan" instead of "Seq Scan".

## 2026-11-17 · Error monitoring that keeps guests' data private

**What we built**

Unexpected errors now go to Sentry, so we hear about a crash before a restaurant has to tell us. There are two Sentry projects: **cravins-api** (the server) and **cravins-web** (the web app).

**How it works**

```
crash ─► scrub (drop headers, body, query, user, breadcrumbs) ─► Sentry
```

- **Server:** only unexpected errors are reported, never a normal answer like "wrong code".
- **App:** Sentry's code is downloaded _only after the first error_, in its own 52 KB file. A guest on a normal visit downloads nothing extra.
- **Demo:** sends nothing.

**Files to look at**

- `server/src/monitor.ts` and `src/lib/monitorScrub.ts`: the scrubbing, with tests that try to leak a phone, a token and an email.
- `src/lib/monitor.ts`: the lazy loading.

**New idea: lazy loading**

`import('./sentryClient')` (with brackets) tells the bundler to put that code in a separate file and fetch it only when this line runs. The main bundle stayed exactly the same size: 295,204 bytes gzipped, against 295,208 before.

**Try it yourself**

Open Sentry (cravins-app.sentry.io) after something breaks. You'll see the error and the page path, but no names, phones or tokens.

## 2026-11-17 · Making the app lighter for guests

**What we built**

- **Every page is 97 KB lighter** (gzipped). A guest's table page went from 648 KB to 551 KB of JavaScript.
- **Owners' photos are shrunk before upload.** A 4,000 px phone photo becomes 1,600 px and a few hundred KB, so guests don't download megabytes per dish. Photos over 5 MB are now accepted, because they shrink under the limit.

**How it works**

The 97 KB was a validation library, Zod. Even its "mini" version pulled in its error messages for every language, only to check about a dozen settings and two URL parts. Those are now plain `if` checks, and the same tests prove they behave the same.

```
before: 648 KB  ███████████████████████████
after:  551 KB  ███████████████████████
budget: 350 KB  ███████████████
```

The rest is mostly the framework (Expo Router, React Native for web, React) and the animation library (Reanimated). Getting under the 350 KB budget means loading animations later, which is a bigger change for another day.

**Files to look at**

- `src/lib/env.ts`: settings without a library.
- `src/features/owner/data/shrinkImage.ts`: draw the photo smaller on a canvas, then save it as JPEG.
- `e2e/photo-shrink.spec.ts`: uploads an 11 MB photo and checks a 1600 px JPEG comes out.

**New idea: measure what's actually in the bundle**

A library's size on disk isn't what users download. The build drops the unused parts, so I measured each library's share of the _final_ file using its source map. That showed Zod at 481 KB, while all the icons together were only 79 KB.

**Try it yourself**

Upload a phone photo to a dish, then open the photo in a new tab. Check its size and width.

## 2026-11-22 · When the restaurant Wi-Fi drops

**What we built**

I tested every owner page with the connection off. Two real problems turned up, and both are fixed:

1. **False empty screens.** Offline, Orders said "No new orders" and Menu said "No sections yet". A busy kitchen could believe there was nothing to cook. Now each page says "You're offline. This page loads as soon as you're back online", and every owner page shows the offline bar.
2. **The crash screen.** Each page's code is a separate file, downloaded the first time you open it. Offline, that download failed and the app showed "This page stopped working". It now says "You're offline" and opens the page by itself when the connection is back. After a new deploy, the old file names are gone, so the app reloads once to pick up the new version.

**How it works**

```
request offline ─► waits (paused)  ─► isLoading = false, data = none  ─► "No new orders"  ✗
                                      isPending = true                ─► "You're offline" ✓
```

`isLoading` means "fetching right now". A request waiting for the network isn't fetching, so the screen thought it was done. `isPending` means "no data yet", which is what the screen needs to know.

**Files to look at**

- `src/features/owner/chrome/DeskWait.tsx`: the offline message.
- `src/ui/AppErrorBoundary.tsx` and `src/ui/chunkError.ts`: the page-file case.
- `e2e/owner-offline.spec.ts`: both cases, tested in a real browser.

**New idea: test the unhappy path**

Everything looked fine online. Only switching the connection off showed what a waiter on bad Wi-Fi would see.

**Try it yourself**

In Chrome's developer tools, go to Network → Offline, then tap through the owner app.
