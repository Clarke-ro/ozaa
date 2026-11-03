# Payments are off in this build

On 2026-11-03 we took payments out of the active build so Ozaa can launch with ordering, waiter calls and table QR codes first. No payment code is lost:

- **`feature/payments-v1`** (pushed to GitHub, at commit `be55dcb`) holds the full payment build: the guest Pay screen, the owner Payments screen, the payout setup step, and the Paystack sandbox server.
- On `main`, payment screens are **hidden behind a flag**, not deleted. Only the Paystack server and its signature helper were removed, because they can't run without a secret key.

## The flag

`PAYMENTS_ENABLED` (default `false`). `app.config.ts` copies it into `extra.paymentsEnabled`, and `src/lib/features.ts` reads it once:

```ts
import { PAYMENTS_ENABLED, PAYMENT_SERVICES } from '@/lib/features';
```

To switch payments on for a local run:

```sh
PAYMENTS_ENABLED=true npx expo start --web --clear
```

`--clear` matters. Metro caches the app config inside the bundle, so changing the flag without clearing the cache keeps the old value.

## What happens with payments off

| Area | With payments off |
|---|---|
| Guest home | The "Pay & split bill" tile is hidden (`PAYMENT_SERVICES` in `ServiceGrid`). |
| Guest order status | No Pay button and no paid/unpaid line. It says "Pay at the counter, or ask your waiter for the bill." |
| `/[venue]/pay` | Redirects to the order status page. |
| Ask for the bill | Unchanged: it's a waiter call with reason `bill`. |
| Owner nav | "Payments" and the "Register" (counter till) preview are hidden (`payments: true` in `nav.ts`). |
| `/owner/payments`, `/owner/pos` | Redirect to Orders. |
| `/dev/mock-checkout` | Redirects to `/`. |
| Today | No sales figure, no period switch, no sales bars (`SalesSummary` isn't rendered). No payout alert. |
| Insights | No Sales card. Top dishes are ranked by how many sold, not by money. |
| Orders | No paid/unpaid pill on tickets. |
| Floor | No "Mark paid in cash" button. The bill shown is the order total. |
| Setup | The Payout step is skipped (3 steps, not 4). |
| Services (owner) | The Pay service isn't listed. |
| Notifications | The transactions feed isn't fetched, so there are no payment lines. |
| Printed table cards | "Scan to see the menu, order and call a waiter" (no "pay"). |

### How a table's bill works without payments

Nothing in the app can mark a meal paid any more, so "waiting to pay" can't come from payment status. It comes from the guest's **bill request**:

```
guest taps "The bill" → waiter call (reason: bill) → floor shows "Waiting for the bill", alert counts it
staff tap "Bill settled" → call resolved → every order placed before the request is closed → table frees
guest orders again → new order is newer than the settled request → table is busy again
```

The logic is in `deriveFloor` (`src/features/owner/floor/floorStatus.ts`) and `summarizeDay` (`src/features/owner/desk/daySummary.ts`). Both take a `payments` flag, and both modes are tested.

## Deleted from `main` (kept on `feature/payments-v1`)

- `server/index.mjs`, `server/README.md`: the Paystack sandbox. It refuses to start without `PAYSTACK_SECRET_KEY`.
- `src/lib/paystackSignature.ts` and its test: only the server needed them.

`PAYSTACK_SECRET_KEY` was only ever commented out in `.env.example`, and the app never read it. No npm package was payment-only (Ozaa calls Paystack over plain HTTP from the server), so `package.json` is unchanged.

## Left in place, unused

- **API contract:** `api/openapi.yaml` still has `/payments*`, `/webhooks/paystack`, the payout, transaction, refund and cash routes, and the `paymentStatus` and `paidPesewas` fields on orders. `src/lib/api/schema.ts` and the fixtures are unchanged. Removing them would change the contract's meaning, which needs Clarke's OK (AGENTS.md).
- **Data:** there's no database yet. The mock (`src/mocks/`) still keeps payments, quotes and payouts in memory, and new orders are still created as `paymentStatus: 'unpaid'`. When the real backend is built, keep the payment tables and columns, just don't use them until payments return.
- **Code still in the bundle but unreachable:** `src/features/pay/`, `src/features/owner/screens/payments/`, `src/features/owner/desk/refund.ts`, `canRefund` and `moneyTotals` in `desk/ops.ts`, `PosShell`, and the payment i18n keys. Their tests still run and pass.

## Known side effects

- **Loyalty stamps** are added automatically only when a payment succeeds (`paid_visit` in `src/mocks/mockClient.ts`). With payments off, staff add stamps by scanning the guest's card (Owner → Scan and stamp). The guest loyalty copy still says "Added automatically when you pay with Ozaa". We left loyalty unchanged on purpose; decide this before launch.
- **Copy changed** in `en.json`: "Waiting to pay" became "Waiting for the bill", the floor filter is "Bill", the notifications empty text no longer mentions payments, and the Insights hint no longer mentions sales. Other languages fall back to English for the new keys (`status.payAtCounter`, `owner.billSettled`, `ownerTables.ctaNoPay`) but still carry their old "waiting to pay" translations.

## Bringing payments back

1. Set `PAYMENTS_ENABLED=true` (and clear the Metro cache). Every hidden screen comes back. This is checked: with the flag on, the Pay screen and the owner Payments screen open with no console errors.
2. Restore the server from the branch: `git checkout feature/payments-v1 -- server src/lib/paystackSignature.ts src/lib/paystackSignature.test.ts`, then put a **test** key in `server/.env`.
3. Decide whether loyalty stamps should again come only from paid orders.
4. Once payments are permanent, remove the flag. Search for `PAYMENTS_ENABLED` and `PAYMENT_SERVICES`, keep the "on" branch of each, delete `e2e/payments-off.spec.ts`, and put Payments and Register back in `e2e/owner.spec.ts`.
5. Compare with `git diff feature/payments-v1 main` to catch anything else that changed since.
