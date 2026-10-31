# Payments sandbox

This folder is the only server code before the UI approval gate. It covers `POST /payments`, `GET /payments/{ref}`, `POST /payments/{ref}/verify` and `POST /webhooks/paystack`.

Put `PAYSTACK_SECRET_KEY` in `server/.env`. Use a Paystack test key (`sk_test_...`). Never commit it, and never put it in an `EXPO_PUBLIC_` variable.

The guest app keeps using the mock until `EXPO_PUBLIC_API_LIVE=payments` and `EXPO_PUBLIC_API_URL` point here. Without a test key the process refuses to start, so a missing secret cannot silently pretend to charge anyone.
