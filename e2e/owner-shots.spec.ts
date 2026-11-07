import { expect, test, type Page } from '@playwright/test';

// Screenshots of the owner shell for design review: desktop, tablet and phone, light and dark.
// Run: npx expo export -p web && npx playwright test e2e/owner-shots.spec.ts
const SIZES = [
  ['desktop', 1440, 900],
  ['tablet', 1024, 768],
  ['phone', 390, 844],
] as const;

const PAGES = [
  ['today', '/owner'],
  ['orders', '/owner/orders'],
  ['floor', '/owner/floor'],
  ['calls', '/owner/calls'],
  ['menu', '/owner/menu'],
  ['sales', '/owner/sales'],
] as const;

async function waitLoaded(page: Page) {
  await page.waitForTimeout(350);
  await expect(page.getByRole('progressbar', { name: 'Loading', exact: true })).toHaveCount(0, {
    timeout: 10_000,
  });
  await page.waitForTimeout(400);
}

async function signIn(page: Page) {
  await page.goto('/owner/login', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Send code', exact: true }).click();
  await page.getByRole('textbox', { name: 'Code', exact: true }).fill('123456');
  await page.getByRole('button', { name: 'Enter', exact: true }).click();
  await waitLoaded(page);
}

const label = process.env.SHOTS_LABEL ?? 'after';

for (const scheme of ['light', 'dark'] as const) {
  for (const [size, width, height] of SIZES) {
    test(`owner shell ${size} ${scheme}`, async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width, height },
        deviceScaleFactor: 1,
        colorScheme: scheme,
      });
      const page = await context.newPage();
      await signIn(page);
      for (const [name, href] of PAGES) {
        await page.goto(href, { waitUntil: 'domcontentloaded' });
        await waitLoaded(page);
        await page.screenshot({
          // Outside test-results, which Playwright empties at the start of every run.
          path: `shots/${label}-${name}-${size}-${scheme}.png`,
        });
      }
      await context.close();
    });
  }
}
