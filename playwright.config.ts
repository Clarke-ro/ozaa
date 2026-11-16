import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  // owner-shots only saves screenshots for design review (48 of them). Run it by hand when needed;
  // CI skips it to save Actions minutes.
  testIgnore: process.env.CI ? ['**/owner-shots.spec.ts'] : [],
  timeout: 60_000,
  use: {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    baseURL: 'http://127.0.0.1:4173',
  },
  webServer: {
    command: 'npx --yes serve dist -l 4173 -s',
    port: 4173,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
