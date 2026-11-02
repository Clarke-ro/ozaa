import { expect, test } from '@playwright/test';

const phoneBottomItems = [
  ['Today', 'Today', 'owner-dashboard'],
  ['Floor', 'Floor', 'owner-floor'],
  ['Orders', 'Orders', 'owner-orders'],
  ['Calls', 'Calls', 'owner-calls'],
] as const;

const moreItems = [
  ['Menu', 'Menu', 'owner-menu'],
  ['Services', 'Services', 'owner-services'],
  ['Payments', 'Payments', 'owner-payments'],
  ['Reviews', 'Reviews', 'owner-reviews'],
  ['Tables and QR', 'Tables and QR', 'owner-tables'],
  ['Branding', 'Branding', 'owner-branding'],
  ['Staff', 'Staff', 'owner-staff'],
  ['Insights', 'Insights', 'owner-insights'],
  ['Setup', 'Setup', 'owner-setup'],
  ['Stock', 'Stock', 'owner-stock'],
  ['Register', 'Register', 'owner-pos'],
  ['AI waiter', 'AI waiter', 'owner-ai'],
  ['Marketing', 'Marketing', 'owner-marketing'],
] as const;

async function waitLoaded(page: import('@playwright/test').Page) {
  await page.waitForTimeout(350);
  await expect(page.getByRole('progressbar')).toHaveCount(0, { timeout: 10_000 });
  await page.waitForTimeout(250);
}

async function signInAsOwner(page: import('@playwright/test').Page) {
  await page.goto('/owner/login', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Owner sign in')).toBeVisible();
  await page.getByRole('button', { name: 'Send code', exact: true }).click();
  const codeBox = page.getByRole('textbox', { name: 'Code', exact: true });
  await expect(codeBox).toBeVisible();
  await codeBox.fill('123456');
  await page.getByRole('button', { name: 'Enter', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Floor', exact: true })).toBeVisible();
  await waitLoaded(page);
}

test('owner screens on phone (390x844)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signInAsOwner(page);
  for (const [label, _title, name] of phoneBottomItems) {
    await page.getByRole('button', { name: label, exact: true }).click();
    await waitLoaded(page);
    if (name === 'owner-floor') {
      const tile = page.getByRole('button', { name: /Table 12|12\./ }).first();
      await expect(tile).toBeVisible();
      await tile.click();
      await page.waitForTimeout(150);
    }
    await page.screenshot({ path: `test-results/${name}-phone.png`, fullPage: false });
  }
  await page.getByRole('button', { name: 'More', exact: true }).click();
  await waitLoaded(page);
  await page.screenshot({ path: `test-results/owner-more-phone.png`, fullPage: false });
  for (const [label, _title, name] of moreItems) {
    await page.getByRole('button', { name: 'More', exact: true }).click();
    await expect(page.getByRole('button', { name: label, exact: true })).toBeVisible();
    await page.getByRole('button', { name: label, exact: true }).click();
    await waitLoaded(page);
    if (name === 'owner-tables') {
      const row = page.getByRole('button', { name: /Table 1/ }).first();
      await expect(row).toBeVisible();
      await row.click();
      await page.waitForTimeout(150);
    }
    await page.screenshot({ path: `test-results/${name}-phone.png`, fullPage: false });
  }
});

test('owner screens on tablet (1024x768)', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await signInAsOwner(page);
  for (const [label, _title, name] of [...phoneBottomItems, ...moreItems]) {
    await page.getByRole('button', { name: label, exact: true }).first().click();
    await waitLoaded(page);
    if (name === 'owner-floor') {
      const tile = page.getByRole('button', { name: /Table 12|12\./ }).first();
      await expect(tile).toBeVisible();
      await tile.click();
      await page.waitForTimeout(150);
    }
    if (name === 'owner-tables') {
      const row = page.getByRole('button', { name: /Table 1/ }).first();
      await expect(row).toBeVisible();
      await row.click();
      await page.waitForTimeout(150);
    }
    await page.screenshot({ path: `test-results/${name}-tablet.png`, fullPage: false });
  }
});
