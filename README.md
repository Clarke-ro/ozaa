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

Each restaurant connects its own Paystack account in Integrations. Guests pay in the app only where it's connected; everywhere else they pay in person and staff mark the order paid. Test keys only for now. The Paystack server isn't built yet (BUILD.md 2b), so payments run on the mock.
