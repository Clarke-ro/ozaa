import { gzipSync } from 'node:zlib';
import { expect, test } from '@playwright/test';

// BUILD.md section 11: the JavaScript a guest downloads before the table home works. Most of it
// is the framework (React, React Native Web, Expo Router), so this is a ceiling, not a target:
// it fails when a change makes the page heavier, and gets lowered when we make it lighter.
// Measured on the mock build CI runs, after the venue has loaded, so the number is repeatable.
const GUEST_HOME_BUDGET_KB = 510;

test('the guest table home stays inside its JavaScript budget', async ({ page }) => {
  let bytes = 0;
  page.on('response', async (response) => {
    if (response.request().resourceType() !== 'script') return;
    const body = await response.body().catch(() => null);
    if (body) bytes += gzipSync(body).length;
  });
  await page.goto('/mamas-kitchen/t/12');
  await expect(page.getByRole('heading', { name: "Mama's Kitchen" }).first()).toBeVisible({
    timeout: 15_000,
  });
  await page.waitForLoadState('networkidle');
  const kb = Math.round(bytes / 1024);
  test.info().annotations.push({ type: 'guest home JS (KB gzipped)', description: String(kb) });
  console.log(`guest table home: ${kb} KB gzipped JS (budget ${GUEST_HOME_BUDGET_KB})`);
  expect(kb).toBeLessThanOrEqual(GUEST_HOME_BUDGET_KB);
});
