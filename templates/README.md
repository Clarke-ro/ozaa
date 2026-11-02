# templates/

Starter config files for step 0.2 of BUILD.md. Copy them into the new repo:

| File here | Goes to |
|---|---|
| `tsconfig.json` | `tsconfig.json` |
| `eslint.config.js` | `eslint.config.js` (after `npx expo lint` creates the base) |
| `prettierrc.json` | `.prettierrc.json` |
| `commitlint.config.js` | `commitlint.config.js` (plus `npm i -D @commitlint/cli @commitlint/config-conventional`) |
| `env.example` | `.env.example` |
| `ci.yml` | `.github/workflows/ci.yml` |
| `pull_request_template.md` | `.github/pull_request_template.md` |
| `app.config.snippet.ts` | merge into `app.config.ts` |
| `package-scripts.json` | merge into `package.json` |
| `LEARNING.template.md` | `LEARNING.md` |

These were written against Expo SDK 58 on 31 Oct 2026 but not run in a real project. Check each one against the docs for the installed version, and fix anything that has drifted.
