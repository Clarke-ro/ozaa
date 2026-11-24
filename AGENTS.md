# AGENTS.md: instructions for every coding agent on the Cravins repo

Keep this file current.

## Who you are working for

Clarke is building Cravins, a QR table app for restaurants in Ghana. He is a **beginner** who is learning from this code. Write code he can read, and explain what you did in plain words.

## Read first, every session

1. `BUILD.md`: what we're building, the order, the rules, and the checklist. Find the first unticked box in section 13. That is your task.
2. `design/brand.md` and `design/tokens.json`: how it must look and sound.
3. `api/openapi.yaml` and `api/MOCKS.md`: the fixed contract and the mock.
4. `docs/ARCHITECTURE.md`: how the app and server fit together.

**Order of precedence when sources disagree:** Clarke's decisions (BUILD.md section 4) and `design/brand.md` > `api/openapi.yaml` > Expo docs for the installed SDK.

## How you work

- Concise, detailed answers, simple code and verified work.
- **Before each feature, sketch it.** Write the types, function signatures and file list, put them in the PR description, then fill in the code.
- **Write the failing test first for logic:**
  - money totals, bill split and tips
  - loyalty stamp rules
  - theming contrast (`deriveTheme`)
  - the payment state machine
  - order and waiter-call state machines, the game engine, phone and hours parsing
- **Before merging, write a short blast-radius summary** of the diff (what else it can affect) into the PR.
- **Keep all UI copy and docs plain** (README, PR text, comments): short sentences, no filler. Copy must also match `design/brand.md` section 10.
- Principles:
  - Prove it works: check the real thing (tests, type check, lint).
  - One small PR per checklist box.
  - The smallest change that works.
  - Unions for states, branded `Pesewas`.
  - zod at the edges only.

## Hard rules

1. **Frontend first.** Build the UI on the mock API (`EXPO_PUBLIC_API_MODE=mock`). Do not write backend code until Clarke approves the UI at the gate in BUILD.md Phase 4. The one exception is the Paystack sandbox slice in Phase 2b.
2. **Keep to the contract.** Use only endpoints and fields in `api/openapi.yaml`. If you need a change, make it in its own PR first: lint it, regenerate types, update fixtures. Never hand-edit `src/lib/api/schema.ts`.
3. **Match the renders.** Every screen has a render in `design/renders/` (mapping in BUILD.md section 6). Build to match it. Screenshots are optional, not required before calling work done or opening a PR (Clarke, 2026-11-09).
4. **Never mention TakeOrder.** Not in code, comments, copy, commits, docs or file names. The product is Cravins. (Also never use "ScanChop", an old working name.)
5. **Money:**
   - Integer pesewas only, and the server total wins.
   - Only a `succeeded` payment counts.
   - Cravins never holds funds. Each restaurant connects its own Paystack keys; money goes straight to its account (BUILD.md section 4, changed 2026-11-03). A venue's secret key is stored encrypted on the server only.
   - **The Paystack secret key lives only on the server.** It never goes in the app, in `EXPO_PUBLIC_*` or in git.
   - Sandbox (test) keys only until Clarke says otherwise.
6. **Privacy (Act 843):**
   - No personal data in a guest session. Menu-link (pickup/delivery) orders may carry name, phone and delivery address on the order only.
   - Loyalty consent is recorded with its text version. Marketing consent is separate and unticked.
   - No phones or tokens in logs or URLs.
7. **Expo hygiene:**
   - Routes live in `src/app/` and stay thin.
   - Install packages with `npx expo install`.
   - Check with `npx expo lint` and `npx tsc --noEmit`.
   - Use CNG: never edit `ios/` or `android/`.
   - Read the docs for the installed SDK version before using an API.
8. **Code shape:**
   - Group by feature (BUILD.md section 6). One component per file. Keep pure logic in plain `.ts` with tests.
   - Comment the non-obvious _why_ (Paystack rules, Ghana law, contrast maths, game tuning). Don't comment the obvious.
   - When a file grows past about 200 lines, refactor it into smaller ones.
9. **Taste.** Black and white base. Orange (or the venue colour) only on buttons, icons and small accents. One filled button per screen. No gradients, emoji icons or decorative AI sparkle. After each screen, review it against the render and `design/brand.md` and remove anything that doesn't earn its place.
10. **No external actions.** Don't buy anything (domains, services), sign up for anything, post anything or message anyone. Ask Clarke instead.

## Commits and PRs

- **Every PR merges into `main`. Never stack PRs** (one PR aimed at another PR's branch). GitHub shows a stacked PR as merged, but its work lands on the other branch, not on `main`. If a PR needs work that isn't merged yet, wait for it to merge, then branch from `main`. The "PR target" check fails on any PR that doesn't merge into `main`.
- Title: conventional commit, such as `feat(pay): add MoMo approval countdown`.
- Body in plain words, three short lines:
  - **What** changed.
  - **Why**.
  - **How I checked it** (tests, type check, lint).
- One checklist box per PR. Tick the box in BUILD.md in the same PR.
- PR description: the sketch and the blast-radius summary. Screenshots are welcome but optional. Use `.github/pull_request_template.md`.

## Ask Clarke (do not guess)

Stop and ask, or build behind a default and say so in the PR, for:

- Anything in BUILD.md section 17:
  - Paystack fee bearer and Cravins's own fee
  - the legal checks (PSP licence and DPC registration)
  - SMS/OTP and hosting providers
  - domains and trademark
  - translators
  - real venue content
  - moving Setup earlier
- Any change to the contract that changes meaning (not just adding a field).
- Any new dependency over about 50 KB gzipped on the guest web bundle.
- Any design that has no render. Show him a screenshot before polishing it.
- Moving past the UI approval gate. **You need his written yes.**
- Anything involving real money, real phone numbers, live keys or store submissions.
