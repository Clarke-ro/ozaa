import { expect, test, type Page } from '@playwright/test';
import { SERVER } from './tags';

// The order and its payment are one page (Clarke, 2026-11-23): MoMo, Cash or Card, then Place
// order. MoMo and card open Paystack's page (the mock's stand-in here); Cash at a table asks the
// waiter for the bill. A pickup order is paid in the app, so it has no Cash (Clarke, 2026-11-16).

async function basket(page: Page) {
  await page
    .getByRole('button', { name: /^Add .+ to your order$/ })
    .first()
    .click({ timeout: 15_000 });
  await page.getByRole('button', { name: /View order/ }).click();
}

test('table: the order page has the payment choices, and MoMo opens the payment page', async ({
  page,
}) => {
  await page.goto('/mamas-kitchen/t/12', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /^Menu/ }).first().click({ timeout: 15_000 });
  await basket(page);
  await expect(page.getByRole('radio', { name: /^MoMo/ })).toBeChecked();
  await expect(page.getByRole('radio', { name: /^Cash/ })).toBeVisible();
  await expect(page.getByRole('radio', { name: /^Card/ })).toBeVisible();
  // Whole bill and no tip to start (Clarke, 2026-11-23).
  await expect(page.getByRole('radio', { name: 'Whole bill' })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'No tip' })).toBeChecked();
  await page.screenshot({ path: 'test-results/payment-table.png', fullPage: true });
  await page.getByRole('button', { name: 'Place order', exact: true }).click();
  await page.getByRole('button', { name: 'Pay', exact: true }).click({ timeout: 15_000 });
  await expect(page).toHaveURL(/\/mamas-kitchen\/pay\?reference=/, { timeout: 15_000 });
  await expect(page.getByText('Paid. Your order is with the kitchen.')).toBeVisible({
    timeout: 20_000,
  });
});

test('table: Cash asks the waiter for the bill', SERVER, async ({ page }) => {
  await page.goto('/mamas-kitchen/t/12', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /^Menu/ }).first().click({ timeout: 15_000 });
  await basket(page);
  await page.getByRole('radio', { name: /^Cash/ }).click();
  // Paid in person, so no tip or split here.
  await expect(page.getByRole('radio', { name: 'No tip' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Place order', exact: true }).click();
  await expect(page).toHaveURL(/\/mamas-kitchen\/status$/, { timeout: 15_000 });
});

test('online pickup: paid in the app, so no Cash and no split', async ({ page }) => {
  await page.goto('/bean-there', { waitUntil: 'domcontentloaded' });
  await basket(page);
  await page.getByRole('textbox', { name: 'Your name' }).fill('Ama');
  await page.getByRole('textbox', { name: 'Phone number' }).fill('024 123 4567');
  await expect(page.getByRole('radio', { name: /^MoMo/ })).toBeVisible();
  await expect(page.getByRole('radio', { name: /^Cash/ })).toHaveCount(0);
  await expect(page.getByText(/Split equally/)).toHaveCount(0);
  await page.getByRole('button', { name: 'Place order', exact: true }).click();
  await expect(page).toHaveURL(/\/dev\/mock-checkout/, { timeout: 15_000 });
});

test(
  'a venue without payments in the app sends the order straight to the kitchen',
  SERVER,
  async ({ page }) => {
    await page.goto('/auntie-akos/t/7', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /^Menu/ }).first().click({ timeout: 15_000 });
    await basket(page);
    await page.getByRole('button', { name: 'Send to kitchen' }).click();
    await expect(page).toHaveURL(/\/auntie-akos\/status$/, { timeout: 15_000 });
  },
);

test(
  'an online customer typing a table page address is sent to the online menu',
  SERVER,
  async ({ page }) => {
    await page.goto('/mamas-kitchen/waiter', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/mamas-kitchen$/, { timeout: 15_000 });
    await page.goto('/mamas-kitchen/play', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/mamas-kitchen$/, { timeout: 15_000 });
  },
);
