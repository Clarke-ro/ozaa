# Gap table: cravins vs the MenuRite reference

**Date:** 2026-11-03. **Phase 0 audit, no code changed.**

MenuRite (18 screenshots in `Downloads/menurite-dashboard`) is a layout and feature reference only. Nothing from its branding, text or code goes into Cravins.

Key: **Full** = done, nothing to build. **Partial** = some of it exists, fill the gap. **None** = new work. **Blocked** = needs a decision from Clarke before any code (see the last section).

## 1. Owner web dashboard

| Feature | Status | Where it lives now | What's missing |
|---|---|---|---|
| Left sidebar in groups | Partial | `src/features/owner/chrome/OwnerChrome.tsx`, `NavRow.tsx`, groups in `chrome/nav.ts` (`service`, `guestPage`, `growth`, `business`, `previews`) | Regroup into Main / Sales / Settings, make it collapsible, plan badge at the top, help / profile / log out at the bottom. Some items in the brief have no screen yet (Categories, Store notice, Promos, Integrations, Billing). |
| Home: 4 stat cards | Partial | `screens/dashboard/DashboardScreen.tsx`, `OverviewPanel.tsx`, `SalesSummary.tsx` | Has sales today, live orders, open calls, rating. Needs orders today, pending orders, visitors today. `OwnerDashboard` in the contract has no `ordersToday` or `visitorsToday`. Sales is hidden while `PAYMENTS_ENABLED=false`. |
| Home: "Complete your setup" checklist with % | Partial | `screens/setup/SetupScreen.tsx` is a 3–4 step wizard | No checklist card on Home and no progress bar. Can be worked out on the phone from data we already fetch (venue, menu, tables, payout). |
| Home: quick action tiles | Full | `DashboardScreen.tsx` shortcuts, `kit/IconTile.tsx` | — |
| Menu editor on a live phone preview | Partial | `screens/menu/MenuScreen.tsx` (list + `DragList` reorder, sections sheet). `screens/branding/GuestPreview.tsx` is a preview, but only on Branding | Edit-in-place on a phone-shaped guest preview. Right rail with menu link + copy, publish toggle, quick style. |
| Menu publish / unpublish | None | — | No `published` field on the venue. Contract change. |
| Categories page | Partial | `screens/menu/SectionsSheet.tsx`, `SectionEditor.tsx` (a sheet inside Menu) | Own sidebar entry; can reuse the sheet as a page. |
| Add/edit item: image, name, description, category, price | Full | `screens/menu/DishEditor.tsx`, `kit/PhotoField.tsx` | — |
| Item status: available / out of stock / hidden | Partial | `available: boolean` on `MenuItem` | No "hidden". Needs a `status` enum (contract change). |
| Sale price | None | — | `salePricePesewas` (contract + guest display + order maths on the server). |
| Stock count (blank = unlimited) | None | `/owner/stock` is a preview shell only (`productShells.tsx`) | `stockCount` field, auto sold-out at 0. |
| Min / max quantity | None | Guest quantity is 1–50 (`OrderLineInput`) | `minQuantity`, `maxQuantity` on the item. |
| Size variations with own prices | Partial | `ModifierGroup` with `min 1, max 1` already acts as a required single choice; edited in `AddOnsEditor.tsx` | Works today as a "Size" add-on group with a price difference. A true "variations replace the base price" model would be a contract change. I suggest keeping add-on groups and adding a "Size" preset. |
| Add-ons | Full | `AddOnsEditor.tsx`, `src/features/menu/modifierRules.ts` | — |
| Orders: status tabs with counts | Partial | `screens/orders/OrdersScreen.tsx` (tabs New, Cooking, Ready, Done) | Counts on the tabs, a Rejected tab and an All tab. Our states are `received, preparing, ready, served, cancelled`, so "accepted" has no state. Map: Pending = received, Preparing, Ready, Served, Rejected = cancelled. Adding a separate "accepted" changes the order state machine and needs your OK. |
| Orders: date filter | None | Owner orders list has no date query | Contract: `from`/`to` on `ownerListOrders`. |
| Orders: create a manual order | None | `/owner/pos` is a preview shell | New owner endpoint. |
| Orders: table / source label | Partial | `tableCode` on `Order`, shown on `OrderCard.tsx` | No `source` (table / pickup / delivery). |
| Live orders with sound alerts | Partial | Polling every 5 s in `OrdersScreen.tsx`; notifications feed in `screens/notifications/` | No sound. No audio package installed (needs `expo-audio`). |
| Waiter calls and bill requests | Full | `screens/calls/CallsScreen.tsx`, `screens/FloorScreen.tsx` | Brief wants them on Orders too: add a strip on Orders, keep the Calls screen. |
| Sales page | Partial | `screens/insights/InsightsScreen.tsx` (sales, series, top items, peak hours; sales hidden with payments off) | Order counts by status, discounts given, breakdown by source. Needs `InsightsReport` fields. |
| Customers | Partial | `screens/LoyaltyCustomersScreen.tsx` (loyalty members only) | Online orders will bring names and phones; see the privacy question. |
| Loyalty | Full | `screens/loyalty/LoyaltyScreen.tsx` and its sibling components | — |
| Promos and coupons | None | Guest offers screen exists (`/[venue]/offers`), no owner editor, no coupon codes | New feature; discounts also touch money maths. Not in the brief's detail list, so I'd leave it as a sidebar entry that says "Coming soon" unless you want it now. |
| Store notice (banner + popup, schedule, toggle) | None | `src/features/notices/` is the guest's own order alerts, not a venue notice | Contract + owner screen + guest banner and popup. |
| Customization: logo, cover, brand colour | Full | `screens/branding/BrandingScreen.tsx`, `LookSection.tsx` | — |
| Customization: font choice | Full | `FontPair` in `VenueTheme`, picker in `LookSection.tsx` | — |
| Customization: item sort, list/grid, light/dark | None | `stylePreset` and `buttonTint` exist, nothing for these | Contract fields + guest menu support. Guest pages are light only today (`src/app/owner/_layout.tsx` note), so guest dark mode is real work across every guest screen. |
| Business info | Full | `screens/business/BusinessScreen.tsx` | — |
| Integrations page | None | `screens/payments/PaymentsScreen.tsx` (ledger), `PayoutAccount` setup | New page. Blocked on payments decision. |
| Staff | Full | `screens/staff/` | — |
| Billing (Cravins plan) | None | — | No plans exist. Plan badge and Billing need you to define plans (section 17 territory). |
| Account | Full | `screens/settings/SettingsScreen.tsx`, `DeleteAccountSheet.tsx` | — |
| Loading / empty / error states | Partial | `DeskWait`, `EmptyCard`, retry buttons on most screens (see `docs/owner-audit.md`) | Check each new screen. |
| Responsive to tablet | Partial | `useWindowDimensions` breakpoints in `OwnerChrome` and `OrdersScreen` (two-up at 900 px) | Check the new layouts at 768 px. |

## 2. Owner mobile app (Expo)

The owner app and the web dashboard are **the same code** (`src/app/owner/*`, one Expo app). Everything in section 1 lands on the phone at the same time; the phone gets bottom tabs (`tabsFor` in `nav.ts`) instead of the sidebar. "Keep app and web in sync" is already true for that reason: both read the same API (the mock today).

| Feature | Status | Notes |
|---|---|---|
| Home stats + setup checklist | Partial | Same as section 1. |
| Orders with status tabs | Partial | Same as section 1. |
| Push alerts | None | Needs `expo-notifications`, a push token endpoint and a real server. Backend work, so after the UI gate. Sound while the app is open can come first. |
| Sound alerts | None | `expo-audio`. |
| Waiter calls, bill requests | Full | `CallsScreen`, `FloorScreen`. |
| Mark as paid | Partial | `ownerRecordCashPayment` exists, button hidden with payments off (`docs/payments-removed.md`). Brief wants cash / card machine / transfer / MoMo, so the endpoint needs a `method`. |
| Menu and item editing (variations, add-ons, stock, sale price) | Partial | Same as section 1. |
| Store notice | None | Same as section 1. |
| Payment settings | Partial | Payout account screen exists, hidden. Blocked on payments decision. |

## 3. Online ordering link

| Feature | Status | Where / what's missing |
|---|---|---|
| Shareable menu link `cravins.app/<slug>` | Partial | `/[venue]` already opens the guest home without a table (`src/app/[venue]/index.tsx`). It isn't presented to owners as "your menu link", and ordering needs a table session today (`/[venue]/t/[table]` makes the guest session). |
| Pickup / delivery choice | None | Contract: order `source` + guest session without a table. |
| Name, phone, address form | None | **Blocked:** AGENTS.md rule 6 says no personal data in a guest session. |
| Table QR flow unchanged | Full | Keep as is. |
| Order records its source | None | Contract change on `Order` and `CreateOrderRequest`. |
| Owner settings: on/off, pickup prep time, delivery fees, distance, free threshold | None | New `VenueSettings` fields. Distance pricing needs the venue's `lat`/`lng` (exists) and the guest's location (new). |
| QR codes and links page | Partial | Table QR download in `screens/tables/` (`qrActions.ts`, `tablePdf.ts`). `screens/links/` is the venue's custom link list (link-in-bio), not the menu link. Needs a menu-link card with copy, share, download QR, plus an embed snippet. |
| Guest confirmation and status page | Partial | `src/features/orders/StatusScreen.tsx` works for table orders; needs a pickup/delivery version. |

## 4. Payments

| Feature | Status | Notes |
|---|---|---|
| Restore `feature/payments-v1` | Partial | The branch is fully merged into `main` already. Only `server/index.mjs`, `server/README.md` and `src/lib/paystackSignature.ts` (+ test) were deleted after. Restore with `git checkout origin/feature/payments-v1 -- server src/lib/paystackSignature.ts src/lib/paystackSignature.test.ts`. All screens are still on `main` behind `PAYMENTS_ENABLED`. |
| That server's model | Conflict | It uses **one** Cravins secret key (`PAYSTACK_SECRET_KEY`) and split payments to the venue's subaccount, as BUILD.md section 4 decided. The brief asks for the opposite: each restaurant pastes its own keys. |
| Owner pastes own public + secret keys, test/live toggle, "test connection" | None | **Blocked**, see below. |
| Secret keys stored encrypted on the backend | None | Needs the real backend (Phase 5) and a key-management choice. |
| Webhook with signature check | Partial | `paystackSignature.ts` on the branch does HMAC-SHA512. With per-venue keys, the server must check each webhook with **that venue's** secret, so the webhook URL needs the venue in it. |
| Manual methods (cash, card machine, transfer, MoMo to merchant number) | Partial | Only "cash" exists (`/owner/orders/{id}/cash-payment`). |
| Guest checkout card + MoMo | Partial | `src/features/pay/` (PayScreen, paymentMachine, PayMethods). 2.4 MoMo wait screen and 2.5 card return are still unticked in BUILD.md. |
| Payment status on orders and sales | Partial | `paymentStatus` on `Order` (`unpaid, part_paid, paid, refunded`). No "paid how" (online vs cash/POS). |
| Split bill left out | Conflict (small) | Split bill is built (`quoteBill.ts`, 2.1 ticked). Leaving it out = hiding the split choice on the Pay screen, not deleting it. |

## 5. Not now

| Feature | Status | Notes |
|---|---|---|
| WhatsApp ordering | — | Stays off. Order alerts have their own owner-only number, `VenueSettings.whatsappAlerts`, apart from the guest-facing `VenuePublic.whatsapp`. The Integrations card for it sits behind `WHATSAPP_ALERTS_ENABLED` in `src/lib/features.ts` (off). |
| POS integration | — | Not built. `/owner/pos` stays a preview. |

## What clashes with the house rules

**Answered by Clarke on 2026-11-03:** 1 own keys, 2 UI first then backend, 3 yes (table QR for walk-ins, menu link for online orders), 4 yes, 5 use the landing page's placeholder plans, 6 yes. BUILD.md sections 4 and 13 (Phase 4b) and AGENTS.md are updated to match.

These parts of the brief go against AGENTS.md or a settled decision in BUILD.md section 4. I haven't built anything for them. Each needs a yes or no from you.

1. **Per-restaurant Paystack keys instead of split payments.** BUILD.md section 4 says split payments to the venue's subaccount, with Cravins's fee in the split. The brief says each restaurant pastes its own keys and Cravins takes nothing. That is a reversal of a settled decision, and it means Cravins stores other businesses' live secret keys. That is a bigger security job: encryption at rest, a key-management service, rotation, and a breach would expose every venue. It may also change the PSP licence question in section 17. The subaccount model needs no secret from the venue at all. **Which model do you want?**
2. **Backend before the UI gate.** Encrypted key storage, webhooks, push alerts and "one change shows in both" with a real database are all Phase 5 work. AGENTS.md rule 1 allows backend code only after your written yes at the UI approval gate (the only exception is the Paystack sandbox slice). **Is this brief that yes, or should I build all of it on the mock first?**
3. **Guest name, phone and address on online orders.** AGENTS.md rule 6 (Act 843) says no personal data in a guest session. Pickup and delivery can't work without a phone number. If you say yes, I'll keep it on the order only (not the session), show a short notice saying why we ask, never log it, and keep the email field out (MenuRite asks for email; we don't need it). **OK to collect name and phone (and address for delivery) on link orders only?**
4. **Contract changes that change meaning:** order `source`, a guest session without a table, item `status` with "hidden", sale price, stock, min/max, store notice, publish flag, menu style fields, payment `method`, venue online-ordering settings, and possibly an "accepted" order state. Rule 2 says each goes in its own PR first. **OK to make these, one contract PR per feature?**
5. **Plans and Billing.** The sidebar wants a plan badge and a Billing page, but Cravins has no plans. **Hide both for now, or tell me the plans?**
6. **Guest dark mode.** Guest pages are light only by design. Adding dark mode touches every guest screen and the venue contrast rules in `deriveTheme`. **Worth doing now, or later?**
7. **New packages:** `expo-audio` (sound alerts) and later `expo-notifications` (push). Both are native-side and don't touch the guest web bundle, so the 50 KB rule isn't hit, but I'm noting them.

## Proposed order (one small PR each)

Things I can build now on the mock, with no decision needed:

1. Sidebar regroup (Main / Sales / Settings), collapsible, help / profile / log out at the bottom. No plan badge until question 5.
2. Home: setup checklist card with % bar, worked out from existing data.
3. Orders: counts on tabs, All and Rejected (= cancelled) tabs, waiter calls and bill strip on Orders.
4. Sound alert for new orders and calls while the owner app is open (`expo-audio`).
5. Categories as its own page (reusing `SectionsSheet`).
6. QR codes and links page: menu link card (copy, share, download QR) and embed snippet, next to the existing table QR codes.
7. "Size" preset in the add-ons editor, so variations with their own price work today.

After your answers to questions 2–4 (each starts with a contract PR):

8. Item fields: status with hidden, sale price, stock count, min/max.
9. Store notice: banner and popup with schedule.
10. Customization: item sort and list/grid (and guest dark mode if you say yes to question 6).
11. Menu editor on a live phone preview, publish toggle, right rail.
12. Orders: date filter and manual "create order".
13. Home stats: orders today, pending, visitors today.
14. Online ordering: venue settings, guest order type, contact form, pickup/delivery status page, source on orders.
15. Sales: counts by status, discounts, source breakdown.
16. Payments: Integrations page, manual methods, method on mark-as-paid, payment status labels. Then the Paystack server in whichever model you choose (question 1), test mode only.
17. Push alerts (with the backend).
