import { expect, test, type Page } from '@playwright/test';
import { signIn as signInStaff } from './signIn';
import { SERVER } from './tags';

// Restaurant Wi-Fi drops. The owner app must say it is offline, never show a false empty state
// ("No new orders") or the crash screen, and pick up again once the connection is back.

async function signIn(page: Page) {
  await signInStaff(page);
}

test('offline, Orders says so instead of "No new orders"', SERVER, async ({ page }) => {
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

test(
  "a page whose code can't download offline says so, and opens once back online",
  SERVER,
  async ({ page, context }) => {
    await signIn(page);
    await context.setOffline(true);
    await page.getByRole('tab', { name: 'Menu', exact: true }).click();
    await expect(page.getByText("You're offline", { exact: true })).toBeVisible();
    await expect(page.getByText('This page stopped working')).toHaveCount(0);
    await context.setOffline(false);
    await expect(page).toHaveURL(/\/owner\/menu$/, { timeout: 15_000 });
    await expect(page.getByText('Mains').first()).toBeVisible({ timeout: 15_000 });
  },
);
