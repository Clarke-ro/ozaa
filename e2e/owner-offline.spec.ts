import { expect, test, type Page } from '@playwright/test';

// Restaurant Wi-Fi drops. The owner app must say it is offline, never show a false empty state
// ("No new orders") or the crash screen, and pick up again once the connection is back.

async function signIn(page: Page) {
  await page.goto('/owner/login', { waitUntil: 'domcontentloaded' });
  await page.getByRole('textbox', { name: 'Phone number' }).fill('024 000 0001');
  await page.getByRole('button', { name: 'Send code', exact: true }).click();
  await page.getByRole('textbox', { name: 'Code', exact: true }).fill('123456');
  await page.getByRole('button', { name: 'Enter', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Today', exact: true })).toBeVisible({
    timeout: 15_000,
  });
}

test('offline, Orders says so instead of "No new orders"', async ({ page }) => {
  await signIn(page);
  // The app thinks it is offline (its requests wait); page files still download.
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'onLine', { get: () => false, configurable: true });
    dispatchEvent(new Event('offline'));
  });
  await page.getByRole('tab', { name: 'Orders', exact: true }).click();
  await expect(
    page.getByText("You're offline. This page loads as soon as you're back online."),
  ).toBeVisible();
  await expect(page.getByText('No new orders')).toHaveCount(0);
  // The chips carry no counts until the orders load.
  await expect(page.getByText(/^New\s*0$/)).toHaveCount(0);
});

test("a page whose code can't download offline says so, and opens once back online", async ({
  page,
  context,
}) => {
  await signIn(page);
  await context.setOffline(true);
  await page.getByRole('tab', { name: 'Menu', exact: true }).click();
  await expect(page.getByText("You're offline", { exact: true })).toBeVisible();
  await expect(page.getByText('This page stopped working')).toHaveCount(0);
  await context.setOffline(false);
  await expect(page).toHaveURL(/\/owner\/menu$/, { timeout: 15_000 });
  await expect(page.getByText('Mains').first()).toBeVisible({ timeout: 15_000 });
});
