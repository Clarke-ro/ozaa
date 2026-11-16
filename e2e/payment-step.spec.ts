import { expect, test, type Page } from '@playwright/test';

// After ordering there is one Payment step: the payment methods, plus one "not now" option where
// it makes sense: the bill after the meal at a table, or pay on delivery. Pickup is paid in the
// app (Clarke, 2026-11-16). Mama's Kitchen and Bean There take payments in the app.

async function basket(page: Page) {
  await page
    .getByRole('button', { name: /^Add .+ to your order$/ })
    .first()
    .click({ timeout: 15_000 });
  await page.getByRole('button', { name: /View order/ }).click();
}

test('table: Continue to payment, then pay by MoMo', async ({ page }) => {
  await page.goto('/mamas-kitchen/t/12', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /^Menu/ }).first().click({ timeout: 15_000 });
  await basket(page);
  await expect(page.getByText('When do you want to pay?')).toHaveCount(0);
  await page.getByRole('button', { name: /^Continue to payment/ }).click();
  await expect(page).toHaveURL(/\/mamas-kitchen\/pay$/, { timeout: 15_000 });
  await expect(page.getByRole('heading', { name: 'Payment' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Request the bill after your meal' })).toBeVisible();
  await page.screenshot({ path: 'test-results/payment-table.png', fullPage: true });
  await page.getByRole('textbox', { name: 'MoMo number' }).fill('0551234987');
  await page.getByRole('button', { name: /^Pay GH/ }).click();
  await expect(page.getByText('Paid. Your order is with the kitchen.')).toBeVisible({
    timeout: 20_000,
  });
});

test('table: request the bill after the meal calls the waiter for the bill', async ({ page }) => {
  await page.goto('/mamas-kitchen/t/12', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /^Menu/ }).first().click({ timeout: 15_000 });
  await basket(page);
  await page.getByRole('button', { name: /^Continue to payment/ }).click();
  await page.getByRole('radio', { name: 'Request the bill after your meal' }).click();
  // No tip or total to pay now.
  await expect(page.getByRole('button', { name: /^Pay GH/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Request the bill', exact: true }).click();
  await expect(page).toHaveURL(/\/mamas-kitchen\/status$/, { timeout: 15_000 });
});

test('online pickup: pay in the app, with no "later" option', async ({ page }) => {
  await page.goto('/bean-there', { waitUntil: 'domcontentloaded' });
  await basket(page);
  await page.getByRole('textbox', { name: 'Your name' }).fill('Ama');
  await page.getByRole('textbox', { name: 'Phone number' }).fill('024 123 4567');
  await page.getByRole('button', { name: /^Continue to payment/ }).click();
  await expect(page).toHaveURL(/\/bean-there\/pay$/, { timeout: 15_000 });
  await expect(page.getByRole('radio', { name: /Request the bill|Pay on delivery/ })).toHaveCount(
    0,
  );
  await expect(page.getByText(/Split equally/)).toHaveCount(0);
});

test('a venue without payments in the app sends the order straight to the kitchen', async ({
  page,
}) => {
  await page.goto('/auntie-akos/t/7', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /^Menu/ }).first().click({ timeout: 15_000 });
  await basket(page);
  await page.getByRole('button', { name: 'Send to kitchen' }).click();
  await expect(page).toHaveURL(/\/auntie-akos\/status$/, { timeout: 15_000 });
});

test('an online customer typing a table page address is sent to the online menu', async ({
  page,
}) => {
  await page.goto('/mamas-kitchen/waiter', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/mamas-kitchen$/, { timeout: 15_000 });
  await page.goto('/mamas-kitchen/play', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/mamas-kitchen$/, { timeout: 15_000 });
});
