import { expect, test, type Page } from '@playwright/test';

// Pay now or later, chosen before the order goes (Clarke, 2026-11-16). Bean There takes payments
// in the app (Paystack test keys) and online pickup orders.

async function basket(page: Page) {
  await page
    .getByRole('button', { name: /^Add .+ to your order$/ })
    .first()
    .click({ timeout: 15_000 });
  await page.getByRole('button', { name: /View order/ }).click();
}

test('online pickup: pay now goes straight to a test MoMo payment, paid in full', async ({
  page,
}) => {
  await page.goto('/bean-there', { waitUntil: 'domcontentloaded' });
  await basket(page);
  await page.getByRole('textbox', { name: 'Your name' }).fill('Ama');
  await page.getByRole('textbox', { name: 'Phone number' }).fill('024 123 4567');
  await expect(page.getByRole('radio', { name: /^Pay now/ })).toBeChecked();
  await expect(page.getByRole('radio', { name: /Pay when you collect/ })).toBeVisible();
  await page.screenshot({ path: 'test-results/pay-when-online.png', fullPage: true });
  await page.getByRole('button', { name: /^Send and pay/ }).click();

  await expect(page).toHaveURL(/\/bean-there\/pay$/, { timeout: 15_000 });
  await expect(page.getByText('Test payment')).toBeVisible();
  // A pickup order is paid whole: no splitting.
  await expect(page.getByText(/Split equally/)).toHaveCount(0);
  await page.getByRole('textbox', { name: 'MoMo number' }).fill('0241234567');
  await page.getByRole('button', { name: /^Pay GH/ }).click();
  await expect(page.getByText('Paid. Your order is with the kitchen.')).toBeVisible({
    timeout: 20_000,
  });
});

test('at a table: the bill after the meal is the usual; pay now opens Pay with splitting', async ({
  page,
}) => {
  await page.goto('/bean-there/t/7', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /^Menu/ }).first().click({ timeout: 15_000 });
  await basket(page);
  await expect(page.getByRole('radio', { name: /Ask for the bill after your meal/ })).toBeChecked();
  await page.getByRole('radio', { name: /^Pay now/ }).click();
  await page.getByRole('button', { name: /^Send and pay/ }).click();
  await expect(page).toHaveURL(/\/bean-there\/pay$/, { timeout: 15_000 });
  await expect(page.getByText(/Split equally/)).toBeVisible();
});

test('a venue without payments in the app asks nothing: the order goes, paid in person', async ({
  page,
}) => {
  await page.goto('/mamas-kitchen/t/12', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /^Menu/ }).first().click({ timeout: 15_000 });
  await basket(page);
  await expect(page.getByRole('radio', { name: /^Pay now/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Send to kitchen' }).click();
  await expect(page).toHaveURL(/\/mamas-kitchen\/status$/, { timeout: 15_000 });
});
