# Cravins server: Paystack sandbox slice (BUILD.md 2b)

The only server code before the UI approval gate. It does four things, exactly as `api/openapi.yaml` describes them:

| Route | What it does |
|---|---|
| `POST /v1/payments` | Starts a MoMo charge or a card checkout with Paystack |
| `GET /v1/payments/{reference}` | The payment as we know it, refreshed from Paystack every 5 s while open |
| `POST /v1/payments/{reference}/verify` | Asks Paystack now |
| `POST /v1/webhooks/paystack` | Paystack's messages, believed only when signed with the secret key |

Only Paystack's "success" for the same amount and currency (GHS) makes a payment `succeeded`.

## Run it

1. `cp .env.example .env`, then put your Paystack **test** secret key in `.env`. A live key (`sk_live_`) is refused.
2. `npm install`, then `npm run dev`. It listens on http://localhost:4000/v1.
3. In the app's root `.env`, set `EXPO_PUBLIC_API_LIVE=payments` and start the app (`npx expo start --web`). Payment calls go to this server; everything else stays on the mock.
4. Pay at Bean There (`/bean-there/t/7`) with Paystack's test MoMo numbers or test cards from the Paystack docs.

`npm test` runs the tests (no Paystack needed). `npm run typecheck` checks the types.

## Know before you test

- **The amount comes from the app.** The bill still lives in the app's mock, so the app sends the quote in an `X-Cravins-Sandbox-Quote` header. That's only acceptable because the server refuses live keys. Phase 5 removes it: the server works out the bill itself.
- **Payments are kept in memory.** A restart forgets them. Phase 5 moves them to Postgres.
- **Card on the web reloads the page.** Coming back from Paystack's card page loads the app fresh, and the in-browser mock forgets the order. The server still has the payment (see the log). MoMo has no page load, so it works end to end.
- **Webhooks need a public address.** Paystack can't reach your laptop. The app checks with verify instead, so this isn't needed to test. To try webhooks, point Paystack's test webhook URL at a tunnel to `/v1/webhooks/paystack`.
- **Telecel may ask for a code** (`send_otp`). This slice doesn't support entering it yet, so test with MTN first.
- **Logs** are one JSON line per event, with no phone numbers, emails or keys.
