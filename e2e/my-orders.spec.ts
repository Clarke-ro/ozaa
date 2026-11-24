import { expect, test } from '@playwright/test';
import { PAYMENT_PAGE, SERVER } from './tags';

// Online customers can follow their order, see notifications, and find past orders on this
// phone, without an account (Clarke, 2026-11-16).
test(
  'after an online order: track strip, My orders, notifications, and it is still there after a reload',
  SERVER,
  async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/bean-there', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Your orders' }).click({ timeout: 15_000 });
    await expect(page.getByText('No orders yet')).toBeVisible();
    await page.getByRole('button', { name: 'See the menu' }).click();

    // By name: on the real server earlier orders can change which dish is listed first.
    await page
      .getByRole('button', { name: 'Add Flat white to your order' })
      .first()
      .click({ timeout: 15_000 });
    await page.getByRole('button', { name: /View order/ }).click();
    await page.getByRole('textbox', { name: 'Your name' }).fill('Ama');
    await page.getByRole('textbox', { name: 'Phone number' }).fill('024 123 4567');
    await page.getByRole('button', { name: 'Place order', exact: true }).click();
    // MoMo is picked to start, so the payment page opens (the mock's stand-in for Paystack's).
    await expect(page).toHaveURL(PAYMENT_PAGE, {
      timeout: 15_000,
    });
    // Back on the venue page: the order is followed live.
    if (page.url().startsWith('https://checkout.paystack.com/')) {
      // Against the real server that is Paystack's own site. The order is on the server and in
      // this browser's order list, so a page load back to the venue loses nothing.
      await page.goto('/bean-there', { waitUntil: 'domcontentloaded' });
    } else {
      // On the mock, move inside the app: a full page load restarts the demo's in-browser data.
      await page.evaluate(() => {
        window.history.pushState({}, '', '/bean-there');
        window.dispatchEvent(new PopStateEvent('popstate'));
      });
    }
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
  },
);
