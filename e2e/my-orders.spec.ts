import { expect, test } from '@playwright/test';

// Online customers can follow their order, see notifications, and find past orders on this
// phone, without an account (Clarke, 2026-11-16).
test('after an online order: track strip, My orders, notifications, and it is still there after a reload', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/bean-there', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Your orders' }).click({ timeout: 15_000 });
  await expect(page.getByText('No orders yet')).toBeVisible();
  await page.getByRole('button', { name: 'See the menu' }).click();

  await page
    .getByRole('button', { name: /^Add .+ to your order$/ })
    .first()
    .click({ timeout: 15_000 });
  await page.getByRole('button', { name: /View order/ }).click();
  await page.getByRole('textbox', { name: 'Your name' }).fill('Ama');
  await page.getByRole('textbox', { name: 'Phone number' }).fill('024 123 4567');
  await page.getByRole('button', { name: /^Continue to payment/ }).click();
  await expect(page).toHaveURL(/\/bean-there\/(status|pay)$/, { timeout: 15_000 });

  // Back on the venue page: the order is followed live.
  // Moved inside the app: a full page load restarts the demo's in-browser data.
  await page.evaluate(() => {
    window.history.pushState({}, '', '/bean-there');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page.getByRole('button', { name: /^Order #\d+ · / })).toBeVisible({
    timeout: 15_000,
  });
  await page.screenshot({ path: 'test-results/my-orders-strip.png' });

  await page.getByRole('button', { name: 'Your orders' }).click();
  await expect(page.getByText(/^Order #\d+$/).first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('1 × Flat white', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/my-orders.png', fullPage: true });

  // Kept on the phone: still listed after the page is reloaded.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByText(/^Order #\d+$/).first()).toBeVisible({ timeout: 15_000 });

  await page.goto('/bean-there/notifications', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(/order/i).first()).toBeVisible({ timeout: 15_000 });
  expect(errors).toEqual([]);
});
