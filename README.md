# Cravins

Cravins is a QR code table app for restaurants in Ghana, starting in Accra. A guest scans the code on the table and gets that venue's page in the phone browser. They can read the menu, call the waiter, pay with MoMo or card, collect stamps, leave a review, and play a short game while the food is on the way.

The owner uses the same app to watch orders, switch services on and off, and moderate video reviews. Money is settled to the venue by Paystack. Cravins does not hold it.

## Where to start

- `BUILD.md` is the plan, the stack, and the order of work.
- `AGENTS.md` is how a coding agent should work in this repo.
- `LEARNING.md` explains the code in plain language.
- `api/openapi.yaml` is the fixed contract. The app talks to an in-memory mock until the UI is approved.
- `design/renders/` are the screens to match.

## Run it

```bash
npm install
cp .env.example .env
npx expo start --web
```

Open a sample table at `/mamas-kitchen/t/12`, `/bean-there/t/4` or `/auntie-akos/t/7`. The owner sample login is `0240000001` and code `123456`.

```bash
npm test
npx tsc --noEmit
npx expo lint
npx expo export -p web && npx playwright test
```

Each restaurant connects its own Paystack account in Integrations. Guests pay in the app only where it's connected; everywhere else they pay in person and staff mark the order paid. Test keys only for now.

### The sample venues

| Venue | Payments in the app | Online ordering (`/slug`) |
|---|---|---|
| Mama's Kitchen (`/mamas-kitchen`) | Yes (Paystack test) | Pickup and delivery |
| Bean There (`/bean-there`) | Yes (Paystack test) | Pickup |
| Auntie Akos (`/auntie-akos`) | No: pays in person | Off (the link is a menu to browse) |

Owner sample logins (code `123456`): `0240000001` Ama (Mama's Kitchen), `0240000004` Kojo (Bean There), `0240000005` Akosua (Auntie Akos).

The demo remembers an owner's settings **on that device** (Paystack, online ordering, menu edits…), so a reload keeps them. Another phone or browser starts from the samples. To start over, clear the site's data in the browser, or reinstall Expo Go's copy.

### Testing payments

**In the demo** (the Vercel site and `npx expo start`, which use the mock): nothing goes to Paystack and no phone gets a prompt. The "Approve on your phone" step is pretend:

- any MoMo number pays about 5 seconds later,
- a number ending in **0** fails ("Not enough money in the wallet."),
- a number ending in **9** is never approved, and runs out after 3 minutes,
- card opens a pretend checkout page with Pay and Cancel.

**Against Paystack's test mode** (the server in `server/`, with a venue's `sk_test_` key): Paystack's published test details are:

- MoMo (Ghana): MTN **055 123 4987**, no PIN needed.
- Card: **4084 0840 8408 4081**, CVV **408**, any future expiry.

Check them against Paystack's own test payments page in your dashboard docs before relying on them; they change from time to time. A real phone only gets a MoMo prompt with live keys, which stay off until the legal checks (BUILD.md section 4).

### Expo Go on your phone

Expo Go runs the code your computer serves, so it shows whatever version that folder holds:

```bash
git checkout main
git pull
npm install
npx expo start -c
```

`-c` clears the bundler's cache, so the newest code is sent. In Expo Go, close the old project (shake the phone, then **Reload**), and scan the new QR code from the terminal. Your phone and computer need to be on the same Wi-Fi (or use `npx expo start -c --tunnel`).
