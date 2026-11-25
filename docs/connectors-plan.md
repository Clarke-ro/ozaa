# Menu hub and connectors plan

Written 2026-11-24. Clarke's decision the same day: the digital menu is the centre of Cravins. The table QR menu, the online ordering site and delivery apps are all **channels** that read one menu and send orders back into one inbox. Chowdeck is the first outside channel.

**Everything here stays in development** until Clarke says otherwise:

- The UI is built on the mock first, the same way as every other phase.
- Chowdeck is reached with a **test merchant account** only, behind a flag that stays off (`CONNECTORS_ENABLED`).
- No live keys and no real orders. The agent doesn't sign up for Chowdeck or contact them. Clarke does that.

## 1. What Chowdeck's API gives us

Read from [chowdeck-api.readme.io](https://chowdeck-api.readme.io/llms.txt) on 2026-11-24.

| Topic          | What the docs say                                                                                                                                                                                                           |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Base URL       | `https://api.chowdeck.com/merchant`, one host for test and live                                                                                                                                                             |
| Auth           | `Authorization: Bearer <secret key>`, plus a `merchantReference` (the store) in most paths. Both come from the vendor dashboard, Settings → Developers.                                                                     |
| Money          | Integer minor units (kobo in the examples). Pesewas fit as they are.                                                                                                                                                        |
| Categories     | `POST /{merchantReference}/menucategory` is an upsert by our `reference`. `PUT …/menucategory/{ref}` sets `name`, `is_published` and `rank`.                                                                                |
| Dishes         | `POST /{merchantReference}/menu` is an upsert by our `reference`: `name`, `description`, `menu_category_id` (Chowdeck's number), `price`, `in_stock`, `rank`, `images[].path` (a public URL).                               |
| Full sync      | `POST …/menu/bulk-upload` takes every dish with its category inline. **Anything left out is deactivated.**                                                                                                                  |
| Partial sync   | `PUT …/menu/bulk-update` takes `{ reference, price?, in_stock? … }[]`. Use it for price and sold-out changes.                                                                                                               |
| New order      | A webhook `ORDER_CREATED`, then `GET …/order/{orderReference}` for the full order.                                                                                                                                          |
| Order moves    | `PUT …/order/{ref}/accept` with `preparation_duration` in minutes, `…/reject` with `reason` (Chowdeck refunds the customer), `…/ready`, and `POST …/substitution` to offer a swap.                                          |
| Order states   | `received`, `preparing`, `rejected`, `awaiting_pickup`, `in_transit`, `success`. The webhook page also uses `accepted`, `picked`, `arrived` and `completed`.                                                                |
| Webhook events | `ORDER_CREATED`, `ORDER_ASSIGNED`, `ORDER_AWAITING_PICKUP`, `ORDER_PICKED_UP`, `ORDER_ARRIVED_AT_CUSTOMER_LOCATION`, `ORDER_COMPLETE` and `ORDER_ITEMS_UPDATED`. The body is `{ category, description, payload: <order> }`. |
| Webhook check  | Header `x-chowdeck-signature` holds the hex HMAC-SHA256 of the raw body, made with the webhook secret. Failed deliveries are retried with backoff, so handling must be idempotent.                                          |
| Customer data  | The order carries `customer` (name, phone, email) and `customer_address`.                                                                                                                                                   |
| Extras         | Discounts API, and **Relay**: Chowdeck riders on demand (fee quote, then create). Relay could deliver our own online orders later.                                                                                          |
| Ghana          | Chowdeck has run in Accra since May 2025. The API docs only show NGN examples.                                                                                                                                              |

### Gaps and unknowns (Clarke asks Chowdeck)

1. **Add-ons.** Dish responses show `modifiers`, `sides`, `menu_group_ids`, and orders have `type: "group"` with `variant_*` fields. But no documented call **writes** add-ons or variants. Until that's answered, the v1 rule is:
   - A dish with a **Size** group becomes one Chowdeck dish per size ("Jollof · Large").
   - A dish with any other **required** add-on group is not sent. The owner sees why.
   - Optional add-on groups are left off, with a note on the dish.
2. **Test mode.** There's one base URL. The merchant record has `test_webhook_url` and `live_webhook_url`, so test keys seem to exist. Ask how to get a test merchant in Ghana.
3. **State names don't agree** between the orders page and the webhook page, so the adapter accepts both sets (section 4).
4. **How long before Chowdeck auto-rejects** an order nobody accepts. That sets our alarm.
5. **Currency:** confirm `GHS` and pesewas for Ghana stores.
6. **Opening hours and schedules:** "Update Merchant" takes hours. There's no per-dish or per-section schedule.
7. **Commission:** Chowdeck's cut decides the default price rule (for example +20%). That's a business call for Clarke.

## 2. The menu model

Today one venue (location) has one menu: sections and dishes, with add-ons copied into each dish. The new shape:

```
Location menu (what exists today)   every dish, section, photo and base price
  ├─ Add-on library                 shared groups, used by many dishes by id
  └─ Channels                       where the menu is published
       ├─ table      (built in)
       ├─ online     (built in)
       └─ chowdeck   (connector)    price rule, hidden dishes, sync status
```

A brand-wide catalog shared by many locations is a later step. Chowdeck has one `merchantReference` per store, so the per-location menu fits it now.

### Contract sketch

The first sketch is below. 5b.1 made the channel and order parts exact in `api/openapi.yaml` (`Channel`, `PriceRule`, `ChannelSync`, `ChowdeckConnection`), with two changes: a price rule is always `{ percent, roundToPesewas }` (0% is the menu price), and a channel records the menu's `updatedAt` it has instead of a new `Menu.version`. The add-on library and snooze come in 5b.1b.

```ts
type ChannelKind = 'table' | 'online' | 'chowdeck';

type PriceRule =
  | { type: 'same' }
  | { type: 'percent'; percent: number; roundTo: Pesewas }; // +20%, rounded up to GH₵0.50

type ChannelSync =
  | { state: 'off' }
  | { state: 'pending'; since: string }
  | { state: 'synced'; at: string; menuVersion: number }
  | { state: 'failed'; at: string; problems: SyncProblem[] };

type SyncProblem = { itemId?: string; code: 'needs_addons' | 'photo_missing' | 'rejected'; message: string };

type Channel = {
  kind: ChannelKind;
  enabled: boolean;
  priceRule: PriceRule;
  hiddenItemIds: string[];   // left off this channel only
  sync: ChannelSync;         // always { state: 'synced' } for table and online
};

// New on MenuItem
modifierGroupIds?: string[];    // from the add-on library; the embedded copy stays for older clients
snoozedUntil?: string | null;   // sold out until then, on every channel

// New on Order
channel: ChannelKind;           // replaces `source` over time; pickup and delivery stay in fulfilment
externalRef?: string;           // Chowdeck's order reference
acceptBy?: string;              // when the outside channel auto-rejects
```

Customer details on a Chowdeck order follow the Act 843 rule for menu-link orders: name, phone and address on the order only, never in a log or a URL. We don't store the email.

## 3. The connector, on the server

One small interface. The table and online channels use it too, so all orders take one path.

```ts
interface Connector {
  kind: ChannelKind;
  /** Full menu on first publish, then only what changed. */
  publishMenu(
    venue: VenueKeys,
    menu: ChannelMenu,
    changedIds: string[] | 'all',
  ): Promise<SyncResult>;
  setAvailability(venue: VenueKeys, items: { id: string; inStock: boolean }[]): Promise<SyncResult>;
  /** Checks the signature and turns the body into our event, or null if it isn't genuine. */
  readWebhook(rawBody: string, headers: Headers, secret: string): ConnectorEvent | null;
  accept(venue: VenueKeys, ref: string, prepMinutes: number): Promise<void>;
  reject(venue: VenueKeys, ref: string, reason: string): Promise<void>;
  ready(venue: VenueKeys, ref: string): Promise<void>;
}
```

- **Pure parts with tests first:** `channelMenu(menu, channel)` (price rule, hidden dishes, size split), `chowdeckPayload(channelMenu)`, `mapChowdeckOrder(payload)`, `chowdeckStatus(status)` and `verifyChowdeckSignature`.
- **Keys:** the venue's Chowdeck secret key and webhook secret are sealed like its Paystack key (`server/src/secrets/sealed.ts`). They never reach the app.
- **Outbox:** a `connector_jobs` table (venue, channel, job, attempts, next try, last error). It runs inside the server, like the payment re-check, with backoff.
- **Inbox:** a `connector_events` table with a unique key per event (the order reference plus the category), so a retried webhook does nothing the second time.
- **Our reference = our id.** Chowdeck upserts by our `reference`, so dish ids need no mapping table. Only Chowdeck's category numbers are stored.

## 4. Order states

| Chowdeck                 | Cravins     | Who moves it                                              |
| ------------------------ | ----------- | --------------------------------------------------------- |
| `received`               | `received`  | webhook `ORDER_CREATED`                                   |
| `preparing` / `accepted` | `accepted`  | staff press Accept → we call `accept`                     |
| (none)                   | `preparing` | staff, local only                                         |
| `awaiting_pickup`        | `ready`     | staff press Ready → we call `ready`                       |
| `picked` / `in_transit`  | `served`    | webhook `ORDER_PICKED_UP`                                 |
| `completed` / `success`  | `served`    | webhook `ORDER_COMPLETE`                                  |
| `rejected`               | `cancelled` | staff reject → we call `reject`, or Chowdeck auto-rejects |

Payment: Chowdeck collects it, so a Chowdeck order is marked paid by method `chowdeck`. It counts in Sales by channel but never as a Paystack payment, and never creates a payout.

## 5. Guest menu redesign (table and online)

- One scrolling page with every section. The section bar follows the scroll instead of filtering the list.
- The Food/Drinks tabs go. The owner's sections lead.
- On the online site, start with **Pickup or Delivery**: the wait time, the fee and the minimum order.
- Show only what's on now ("Breakfast until 11:00"). A snoozed dish shows "Back at 17:00" in grey, last in its section.
- A "Most ordered" row from real sales, at the top.
- Dish row: name, one-line description, price ("from GH₵45" with sizes), photo on the right, and a quick add button.
- Search that forgives spelling (waakye/wakye) and matches descriptions.

## 6. Owner screens

- **Chowdeck on Integrations** (Clarke, 25 Nov 2026: not a separate page): a Delivery apps group with a Chowdeck card, beside Payments. Its switch, price rule, dishes left off, last send, problems and Publish live in the card. It asks for the store reference, secret key and webhook secret, like Paystack, and shows the webhook address to paste into Chowdeck. Table and online need no card: they read the menu directly.
- **Menu editor:** an add-on library, bulk edit (price by %, sold out), snooze ("for 2 hours", "until close"), and a channel price preview on each dish.
- **Orders:** a channel tag on each order, and an accept-by countdown for Chowdeck orders.
- **Setup:** a Menu step (add sections and dishes, or skip).

## 7. Order of work

Each box is one PR from `main`, following AGENTS.md: contract first, then mock, then UI, then Clarke's yes, then server.

1. **Contract + mock + server:** channels, `Order.channel`, `externalRef`, `acceptBy` and method `chowdeck` (5b.1). Then the add-on library and snooze (5b.1b).
2. **Logic (tdd):** `channelMenu`, the size split, price rules and rounding.
3. **Owner:** add-on library, bulk edit and snooze in the menu editor.
4. **Owner:** Channels page on the mock, with a mock Chowdeck sync and its problems.
5. **Owner:** channel tag and accept-by countdown on Orders, and a Chowdeck order in the mock.
6. **Guest:** menu redesign (scroll-spy sections, no tabs, now-only, Most ordered, new dish row).
7. **Guest:** online site starts with Pickup or Delivery.
8. **Setup:** Menu step.
9. **Review:** Clarke sees the screens and says yes.
10. **Server:** channels, add-on library, snooze and version (migrations, contract tests).
11. **Server:** connector interface, outbox and inbox. The table and online channels go through it.
12. **Server:** Chowdeck adapter with a **test merchant**: publish, availability, webhook, accept, reject and ready. It stays behind `CONNECTORS_ENABLED`, which is off.
13. **Review:** Clarke places a test order on Chowdeck's test store and handles it in Cravins.

Later, not in this phase: a brand-wide catalog across locations, Chowdeck Relay riders for our own delivery orders, scheduled reports, and server rendering for the online site (Clarke's call, see BUILD.md section 17).
