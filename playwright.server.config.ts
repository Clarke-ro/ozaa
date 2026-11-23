import { defineConfig } from '@playwright/test';

// The browser tests against the real server (BUILD.md 5.6), not the mock. Only tests tagged
// @server run here (see e2e/tags.ts). CI does every step in .github/workflows/e2e-server.yml.
// Locally: an empty Postgres in DATABASE_URL, ENCRYPTION_KEY and GUEST_TOKEN_SECRET set, then
//   (cd server && npm run db:migrate && SEED_SAMPLES=true SITE_URL=http://127.0.0.1:4174 npm run db:seed)
//   npm run e2e:server
//
// One test at a time: the database keeps what each test did, unlike the mock, which starts fresh
// on every page load.
const API_PORT = 4000;
const APP_PORT = 4174;

export default defineConfig({
  testDir: 'e2e',
  // E2E_ALL=1 runs untagged tests too, to try which ones already work against the server.
  grep: process.env.E2E_ALL ? undefined : /@server/,
  workers: 1,
  timeout: 60_000,
  use: {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    baseURL: `http://127.0.0.1:${APP_PORT}`,
  },
  webServer: [
    {
      // The server reads DATABASE_URL, ENCRYPTION_KEY and GUEST_TOKEN_SECRET from the environment.
      command: 'npm --prefix server start',
      url: `http://127.0.0.1:${API_PORT}/v1/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        PORT: String(API_PORT),
        SITE_URL: `http://127.0.0.1:${APP_PORT}`,
        ALLOWED_ORIGINS: `http://127.0.0.1:${APP_PORT}`,
        SENTRY_ENVIRONMENT: 'e2e',
      },
    },
    {
      // Built with EXPO_PUBLIC_API_MODE=http and EXPO_PUBLIC_API_URL pointing at the server above.
      command: `npx --yes serve dist-server -l ${APP_PORT} -s`,
      port: APP_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
