import { expect, test, type Page } from '@playwright/test';
import { SERVER } from './tags';

// Guests never sign in, so sending an order must never say "unauthorized" (bug seen 2026-11-16:
// a reload made the demo forget the table's session, and Send showed "errors.unauthorized").

function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function addFirstDishAndOpenOrder(page: Page) {
  await page
    .getByRole('button', { name: /^Add .+ to your order$/ })
    .first()
    .click({ timeout: 15_000 });
  await page.getByRole('button', { name: /View order/ }).click();
}

test(
  'table guest: the page reloads while browsing, and the order still reaches the kitchen',
  SERVER,
  async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/bean-there/t/7', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /^Menu/ }).first().click({ timeout: 15_000 });
    // Reload only once the menu is open. Reloading on the table home has no dish to add.
    await expect(page).toHaveURL(/\/bean-there\/menu$/, { timeout: 15_000 });
    await expect(
      page.getByRole('button', { name: /^Add .+ to your order$/ }).first(),
    ).toBeVisible();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await addFirstDishAndOpenOrder(page);
    // Bean There takes payments in the app, so the order goes and the Payment step opens.
    await page.getByRole('button', { name: /^Continue to payment/ }).click();
    await expect(page).toHaveURL(/\/bean-there\/pay$/, { timeout: 15_000 });
    await expect(page.getByText(/unauthori[sz]ed|errors\./i)).toHaveCount(0);
    expect(errors).toEqual([]);
  },
);
