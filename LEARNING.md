# Learning Ozaa

Plain-language notes for Clarke. Newest at the top.

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
- `src/lib/money.ts`: prices are whole pesewas. `GH₵65` is `6500`.
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
