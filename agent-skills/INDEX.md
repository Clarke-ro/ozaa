# Agent skills for building Ozaa

Collected 31 Oct 2026. Each folder holds a `SKILL.md`. Most are **copied** word for word from their public repo, with a header comment giving the source URL, license and commit. One is **summarized** because its repo has no license. To use a skill, read its `SKILL.md` before you start the task it covers. The task table below says when.

Folder names carry a prefix for their source (`pstack-`, `expo-`, `vercel-` ...). When a pstack skill points to `../<name>/SKILL.md`, open `../pstack-<name>/SKILL.md`.

## 1. When to use what (the short version)

| Moment | Skills to apply |
|---|---|
| Every session | `pstack-poteto-mode` (the working style), `expo-agents-md` (Expo rules), `pstack-principle-never-block-on-the-human` |
| Before starting a feature | `pstack-architect` (types, signatures, file layout first), `pstack-principle-foundational-thinking`, `pstack-principle-model-the-domain`, `pstack-how` when touching code you did not write |
| Order and payment flows | `pstack-statechart` (model the Order, Payment and Waiter-call state machines from BUILD.md section 9 and draw them in Mermaid), `pstack-principle-type-system-discipline` (make illegal states impossible to write) |
| Logic with rules | `pstack-tdd` for bill totals and splits, tips, loyalty stamps, game stamp rule, theme contrast (deriveTheme), payment state, phone normalisation, opening hours. `pstack-principle-test-behavior-not-implementation` |
| Building screens | `expo-router`, `expo-project-structure`, `expo-design-system`, `expo-native-ui`, `expo-data-fetching`, `vercel-react-native-skills`, `callstack-react-native-best-practices`, `vercel-composition-patterns`, `pstack-typescript-best-practices` |
| Making it look designed, not generated | `no-slop-ui`, `taste-skill`, `anthropic-frontend-design`, `impeccable`, `emil-design-eng`, `ui-skills-baseline-ui`, `rauno-interfaces`, `userinterface-wiki`. Ozaa's own rules in `design/brand.md` always win over any of these. |
| Motion | `expo-animation` / `emil-animate-expo` (same text, two sources), `ui-skills-fixing-motion-performance` |
| Web build (guest app runs in a browser) | `emil-mobile-native`, `vercel-web-interface-guidelines`, `vercel-web-design-guidelines`, `vercel-react-best-practices`, `expo-dom` (only if a web-only widget is needed) |
| Accessibility | `ui-skills-fixing-accessibility` plus the a11y rules in BUILD.md |
| Tests and checks | `callstack-react-native-testing`, `pstack-create-verification-skill` (make a project skill that drives the app like a guest), `cursor-team-kit-control-ui` (browser harness and screenshots), `cursor-team-kit-verify-this`, `pstack-principle-prove-it-works` |
| Before opening a PR | `pstack-blast-radius` (what else could break), `pstack-interrogate` on payment, auth and webhook PRs, `cursor-team-kit-deslop` and `pstack-no-comments` (code), `pstack-unslop` (all UI copy and docs), `pstack-principle-subtract-before-you-add`, `pstack-principle-laziness-protocol`, `pstack-principle-minimize-reader-load` |
| Writing copy and docs | `pstack-unslop` first, then `stop-slop`, `no-ai-slop`, `humanizer`, `vercel-writing-guidelines`, `pstack-technical-writing` |
| Explaining to Clarke | `pstack-teach` (LEARNING.md entries), `pstack-bro` (plain-language restatement), `pstack-show-me-your-work` (decision log for long unattended runs) |
| Bugs | `pstack-principle-fix-root-causes`, `pstack-correct` (turn repeated mistakes into lint rules or tests) |
| Splitting work | `pstack-principle-sequence-verifiable-units` (small PRs that each end green), `pstack-principle-experience-first` (fewer, finished features) |
| CI and release | `expo-eas-workflows`, `callstack-github-actions`, `expo-dev-client`, `expo-eas-update`, `expo-eas-hosting` (guest web), `expo-eas-app-stores` (owner app, later), `expo-upgrade` |
| Design doc upkeep | `ui-skills-create-design-md` (keep `design/brand.md` in sync if the design changes), `ui-skills-improve-ui` (read-only UI audit) |

## 2. Every skill, with source and license

### pstack (Cursor plugins, by Lauren Tan, @poteto)
Source: https://github.com/cursor/plugins/tree/main/pstack (commit 4dd1d05, 29 Oct 2026, plugin version 0.15.36). License: MIT © 2026 Lauren Tan. All **copied**. Text matched the pstack skills installed in Grok Bot. The `statechart/scripts/` folder (4 MB of TLA+ tools) was left out. To run the checker, install pstack in Cursor (it ships the scripts) or fetch them from the source URL; drawing the Mermaid chart by hand works without them.

| Folder | What it does | When to apply in Ozaa |
|---|---|---|
| pstack-poteto-mode | The working style: short detailed answers, careful subagents, plain prose, simple code, verified work. Loads the other principles. | Always on. |
| pstack-architect | Sketch types, function signatures and module layout before code, then stay in the loop. | Before every feature in BUILD.md section 12. Put the sketch in the PR description. |
| pstack-blast-radius | Find what a change can break outside the diff and prove the key fact by running code. | Before merging every PR, especially shared design-system, api client and theme changes. |
| pstack-tdd | Red-green-refactor with a failing test first. | Totals, splits, tips, loyalty, game stamp, deriveTheme contrast, payment and order state, phone parsing, hours. |
| pstack-interrogate | Adversarial review that tries to break the code. | Pay, webhook, auth and anything with money. |
| pstack-correct | Find mistakes agents keep making and make them impossible (types, lint, tests). | When the same review comment comes up twice. |
| pstack-how | Explain how a piece of code works before changing it. | Touching an area for the first time. |
| pstack-teach | Explain a body of work so a person understands it. | Every LEARNING.md entry. |
| pstack-bro | Restate the last message in plain words. | Summaries for Clarke. |
| pstack-no-comments | Remove comments that restate code; keep the ones that explain why. | Before each PR. Clarke is learning, so keep "why" comments on anything non-obvious. |
| pstack-unslop | Cut AI tells from writing. | All UI copy, LEARNING.md, PR text, docs. |
| pstack-statechart | Check a TLA+ model of a flow and draw it as a Mermaid statechart. | Order, Payment and Waiter-call state machines (BUILD.md section 9). |
| pstack-show-me-your-work | Decision log (TSV) for long unattended work. | Long agent runs; commit it in `docs/decisions.tsv`. |
| pstack-create-verification-skill | Make a project skill that drives the app the way a user does. | Phase 0: create `.cursor/skills/verify-ozaa/` that opens the web build at 390x844 and screenshots each route. |
| pstack-typescript-best-practices | TypeScript rules. | Every .ts/.tsx file. |
| pstack-technical-writing | Layered writing standard for docs. | BUILD notes, README, LEARNING.md. |
| pstack-principle-prove-it-works | Check the real thing, not a proxy. | Before calling a task done: screenshot vs render, test run, real response. |
| pstack-principle-subtract-before-you-add | Remove dead code before adding. | Every refactor. |
| pstack-principle-laziness-protocol | Smallest change that solves it; no extra layers. | Every PR. |
| pstack-principle-boundary-discipline | Validate at the edges (API, storage, URL params), trust types inside. | api client (zod parse of responses), route params, storage reads. |
| pstack-principle-type-system-discipline | Make illegal states unrepresentable; brand primitives. | `Pesewas`, `GhanaPhone`, `OrderId` brands; union types for states. |
| pstack-principle-test-behavior-not-implementation | Tests check what users see. | All tests. |
| pstack-principle-fix-root-causes | Fix where it first went wrong. | Every bug. |
| pstack-principle-sequence-verifiable-units | Small units that each end in a checked state. | PR plan per phase. |
| pstack-principle-experience-first | Pick user delight over build convenience; fewer polished features. | Scope calls. |
| pstack-principle-minimize-reader-load | Fewer layers between question and answer. | Code review, file layout. |
| pstack-principle-model-the-domain | Model the domain before branching logic. | Orders, bills, loyalty. |
| pstack-principle-foundational-thinking | Get data structures right first. | Store and type design. |
| pstack-principle-never-block-on-the-human | Do reversible work without asking. | Always, except the "ask Clarke" list in AGENTS.md. |

### Expo (official), MIT © 650 Industries
Source: https://github.com/expo/skills. All **copied**. Also `expo-agents-md/AGENTS.md`, copied from https://github.com/expo/expo/blob/main/packages/create-expo/template/agent-files/AGENTS.md (docs: https://docs.expo.dev/agents/).

| Folder | When to apply |
|---|---|
| expo-agents-md | Merge into the app repo's AGENTS.md on day one. Says: read the installed SDK's docs, install with `npx expo install`, run `npx expo lint` and `npx tsc --noEmit`, routes live in `src/app/`. |
| expo-overview | First skill for any Expo task; routes you to the others. |
| expo-project-structure | Phase 0 scaffold and "where does this file go". |
| expo-router | All navigation: guest routes, owner tabs, modals, sheets, deep links from QR codes. |
| expo-data-fetching | API client, TanStack Query, offline, loading/empty/error states. |
| expo-design-system | Building `src/design-system` from `design/tokens.json`. |
| expo-native-ui | Native feel on the owner app (iOS and Android). |
| expo-ui | `@expo/ui` native sheets, pickers, toggles on the owner app (native only; guest web uses our own components). |
| expo-animation | Any animation (same text as emil-animate-expo). |
| expo-dom | Only if a web-only widget must run inside native. |
| expo-dev-client | Dev builds (needed because Expo Go may lag the newest SDK). |
| expo-eas-workflows | CI on EAS. |
| expo-eas-hosting | Deploy the guest web app. |
| expo-eas-update | Over-the-air updates for the owner app. |
| expo-eas-app-stores | Store builds for the owner app (later). |
| expo-upgrade | SDK upgrades. |

### Vercel Labs
Source: https://github.com/vercel-labs/agent-skills. License: MIT, declared in the repo README and in each SKILL.md frontmatter (the repo has no LICENSE file). **Copied**. Release post: https://x.com/vercel_dev/status/2016226892333121635

| Folder | When to apply |
|---|---|
| vercel-react-native-skills | Every React Native screen: lists, images, animation, state, performance. |
| vercel-react-best-practices | React rendering and data rules (the Next.js parts do not apply). |
| vercel-composition-patterns | Component APIs: compound components instead of boolean props. Design-system work. |
| vercel-web-design-guidelines | UI review of the guest web build. |
| vercel-writing-guidelines | Review of copy and docs. |
| vercel-web-interface-guidelines | From https://github.com/vercel-labs/web-interface-guidelines, MIT © 2025 Vercel Labs. Web UI review checklist. Discussed at https://x.com/JohnPhamous/status/2010777566085595357 and https://x.com/JohnPhamous/status/2064395854287655149 |

### Callstack, MIT © 2026 Callstack Incubator
Source: https://github.com/callstackincubator/agent-skills. **Copied** (images in the performance skill left out). Mentioned at https://x.com/TeksCreate/status/2067175522405081310 and https://x.com/cdepino/status/2110047334919028836

| Folder | When to apply |
|---|---|
| callstack-react-native-best-practices | Performance on cheap Android phones: FPS, startup time, bundle size, memory, re-renders. |
| callstack-react-native-testing | Writing Jest + React Native Testing Library tests. |
| callstack-github-actions | Android emulator and iOS simulator builds in GitHub Actions. |

### Design taste and anti-slop UI
| Folder | Source and license | Copied or summary | When to apply |
|---|---|---|---|
| anthropic-frontend-design | https://github.com/anthropics/skills/tree/main/skills/frontend-design, Apache-2.0 | Copied | New screens; pick a clear direction. Ozaa's direction is already set in brand.md, so use it for craft, not for new styles. |
| impeccable | https://github.com/pbakaus/impeccable, Apache-2.0 (NOTICE.md kept) | Copied | Critique, audit and polish passes. |
| taste-skill | https://github.com/Leonxlnx/taste-skill, MIT © 2026 Leonxlnx (https://tasteskill.dev, post: https://x.com/aiedge_/status/2070016711341040054) | Copied | Avoid generic AI looks (stacked labels, rows of icon cards, soft gradients, glows). |
| no-slop-ui | https://github.com/LeoStehlik/no-slop-ui, MIT © 2026 Leo Stehlik | Copied | Build and review UI for a restrained, human-designed look. |
| ui-skills-baseline-ui, ui-skills-fixing-accessibility, ui-skills-fixing-motion-performance, ui-skills-improve-ui, ui-skills-create-design-md | https://github.com/ibelick/ui-skills, MIT © 2026 Julien Thibeaut | Copied | Polish passes, a11y fixes, motion fixes, read-only audits, design-doc upkeep. |
| emil-design-eng, emil-animate-expo, emil-mobile-native | https://github.com/emilkowalski/skill, MIT © 2026 Emil Kowalski | Copied | Polish and motion decisions; making the guest web app feel installed. |
| userinterface-wiki | https://github.com/raphaelsalaja/userinterface-wiki, MIT © 2026 Raphael Salaja | Copied | Reference for animation, type and UX patterns. |
| rauno-interfaces | https://github.com/raunofreiberg/interfaces, no license | **Summarized** (SUMMARY.md, our words, adapted to React Native) | Small details checklist for every screen. |

Found on X while collecting: https://x.com/JustARedditNerd/status/2048607769776042312 (Impeccable, Taste, UI Wiki, frontend-design, web design guidelines), https://x.com/colderoshay/status/2066930925573898433 (taste.md, UI wiki, Emil's skill, ibelick), https://x.com/zentalksai/status/2059246648161685660 (frontend-design), https://x.com/lorden_eth/status/2107440745561178275 (taste-skill, no-slop-ui and more), https://x.com/DataChaz/status/2039637735523409977 (awesome-design-md).

### Anti-slop writing and code
| Folder | Source and license | Copied or summary | When to apply |
|---|---|---|---|
| pstack-unslop | see pstack | Copied | First pass on all copy and docs. |
| stop-slop | https://github.com/hardikpandya/stop-slop, MIT © 2025 Hardik Pandya | Copied | Second pass on prose. |
| no-ai-slop | https://github.com/petergyang/no-ai-slop, MIT © 2026 Peter Yang | Copied | Edit drafts while keeping voice; detect slop. |
| humanizer | https://github.com/blader/humanizer, MIT © 2025 Siqi Chen | Copied (SKILL.md only) | Last pass on longer text like LEARNING.md. |
| cursor-team-kit-deslop | https://github.com/cursor/plugins/tree/main/cursor-team-kit, MIT © 2026 Cursor | Copied | Remove AI code slop before each PR. |

Rankings and lists seen on X: https://x.com/yijidini/status/2091030904739430531 (unslop, stop-slop, humanizer, no-ai-slop), https://x.com/Trorram/status/2091971347496722615 (17 anti-slop skills), https://x.com/mrzmyr/status/2093277466987221482 (unslop plus Vercel writing guidelines).

### Verification (Cursor team kit), MIT © 2026 Cursor
| Folder | When to apply |
|---|---|
| cursor-team-kit-control-ui | Drive the guest web build in a headless browser, take screenshots and compare with `design/renders/`. |
| cursor-team-kit-verify-this | Prove a claim with before/after evidence. |

### Mobile skill roundups on X (used to pick the list above)
- https://x.com/merveeksi6117/status/2022014754789712142 (Expo skills on skills.sh)
- https://x.com/nemoisme/status/2115689816767504888 (Expo Skills)
- https://x.com/betomoedano/status/2045209803228692632 (thread asking for the best RN skills; answers point to Expo, Callstack and Vercel)

## 3. Considered and left out
- dmmulroy/anti-slop, brianlovin deslop, desloppify, thermo-nuclear, Netxeo, design-guide, avoid-ai-design, miqdadbadjuber/anti-slop: they cover the same ground as the copied skills above. Not copied, to keep the kit small.
- shadcn/ui skills: web component libraries, not used in a React Native app.
- awesome-design-md: a list of DESIGN.md files from other brands. Ozaa has its own `design/brand.md`.

## 4. Order of precedence when skills disagree
1. Clarke's decisions in BUILD.md and `design/brand.md`.
2. `api/openapi.yaml` (the contract).
3. `expo-agents-md` and the Expo skills for anything about the SDK.
4. pstack principles.
5. Everything else.
