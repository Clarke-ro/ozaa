# AGENTS.md: instructions for every coding agent on the Cravins repo

Copy this file to the repo root in step 0.1 and keep it current. Expo's own rules are in `agent-skills/expo-agents-md/AGENTS.md`. Follow those too. Where they clash, this file wins.

## Who you are working for
Clarke is building Cravins, a QR table app for restaurants in Ghana. He is a **beginner** who is learning from this code. Write code he can read, explain what you did in plain words, and keep `LEARNING.md` up to date for him.

## Read first, every session
1. `BUILD.md`: what we're building, the order, the rules, and the checklist. Find the first unticked box in section 13. That is your task.
2. `design/brand.md` and `design/tokens.json`: how it must look and sound.
3. `api/openapi.yaml` and `api/MOCKS.md`: the fixed contract and the mock.
4. `agent-skills/INDEX.md`: which skill to use when. Open the skill's `SKILL.md` before doing that kind of work.
5. For any UI work, follow `.cursor/skills/apple-design-rn/SKILL.md` (Claude Code reaches it through a pointer in `.claude/skills/apple-design-rn/`).

**Order of precedence when sources disagree:** Clarke's decisions (BUILD.md section 4) and `design/brand.md` > `api/openapi.yaml` > Expo docs for the installed SDK > pstack skills > the other skills.

## How you work (pstack)
- **Run in `pstack-poteto-mode`** (`agent-skills/pstack-poteto-mode/SKILL.md`). That means concise, detailed answers, simple code, deliberate subagents and verified work.
- **Before each feature, run `pstack-architect`.** Sketch the types, function signatures and file list, put them in the PR description, then fill in the code.
- **Use `pstack-tdd` for logic.** Write the failing test first for:
  - money totals, bill split and tips
  - loyalty stamp rules
  - theming contrast (`deriveTheme`)
  - the payment state machine
  - order and waiter-call state machines, the game engine, phone and hours parsing
- **Before merging, run `pstack-blast-radius`** on the diff and paste its short summary into the PR.
- **Run `pstack-unslop` on all UI copy and all docs** (README, LEARNING.md, PR text, comments). Copy must also match `design/brand.md` section 10.
- **Use `pstack-teach` to write every `LEARNING.md` entry.**
- Lean on the pstack principles when relevant, especially these:
  - `principle-prove-it-works`: screenshot the real screen
  - `principle-sequence-verifiable-units`: one small PR per checklist box
  - `principle-laziness-protocol`: the smallest change that works
  - `principle-type-system-discipline`: unions for states, branded `Pesewas`
  - `principle-boundary-discipline`: zod at the edges only

## Hard rules
1. **Frontend first.** Build the UI on the mock API (`EXPO_PUBLIC_API_MODE=mock`). Do not write backend code until Clarke approves the UI at the gate in BUILD.md Phase 4. The one exception is the Paystack sandbox slice in Phase 2b.
2. **Keep to the contract.** Use only endpoints and fields in `api/openapi.yaml`. If you need a change, make it in its own PR first: lint it, regenerate types, update fixtures. Never hand-edit `src/lib/api/schema.ts`.
3. **Match the renders.** Every screen has a render in `design/renders/` (mapping in BUILD.md section 6). Take a screenshot of your build at 390×844 for each sample venue and compare it with the render before calling it done. Attach both to the PR.
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
   - Comment the non-obvious *why* (Paystack rules, Ghana law, contrast maths, game tuning). Don't comment the obvious.
   - When a file grows past about 200 lines, refactor it into smaller ones.
9. **Taste.** Black and white base. Orange (or the venue colour) only on buttons, icons and small accents. One filled button per screen. No gradients, emoji icons or decorative AI sparkle. After each screen, run the de-slop pass from INDEX.md: `cursor-team-kit-deslop`, then `impeccable` / `ui-skills-improve-ui`.
10. **No external actions.** Don't buy anything (domains, services), sign up for anything, post anything or message anyone. Ask Clarke instead.

## Commits and PRs
- **Every PR merges into `main`. Never stack PRs** (one PR aimed at another PR's branch). GitHub shows a stacked PR as merged, but its work lands on the other branch, not on `main`. If a PR needs work that isn't merged yet, wait for it to merge, then branch from `main`. The "PR target" check fails on any PR that doesn't merge into `main`.
- Title: conventional commit, such as `feat(pay): add MoMo approval countdown`.
- Body in plain words, three short lines:
  - **What** changed.
  - **Why**.
  - **How I checked it** (tests, screenshots).
- One checklist box per PR. Tick the box in BUILD.md in the same PR.
- PR description: the architect sketch, before and after screenshots next to the render, the blast-radius summary, and the LEARNING.md entry link. Use `templates/pull_request_template.md`.

## LEARNING.md (for Clarke)
Use the template in `templates/LEARNING.template.md`. Write one entry per feature with `pstack-teach`. Each entry has:
- what we built
- how it works, in plain words with a small diagram if it helps
- the files to look at
- one new idea explained (for example "what a state machine is")
- one thing to try yourself

Keep each entry under about 300 words.

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
