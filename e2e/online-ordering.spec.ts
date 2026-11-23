import { expect, test, type Page } from '@playwright/test';
import { SERVER } from './tags';

// The venue's own link (/slug) is online ordering, menu first; a table's QR (/slug/t/7) is the
// table guest's home with its services list. Neither may land on the other (Clarke, 2026-11-16).

function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function addFirstDish(page: Page) {
  await page
    .getByRole('button', { name: /^Add .+ to your order$/ })
    .first()
    .click({ timeout: 15_000 });
}

test('the menu link opens the menu first, and a pickup order reaches its status page', async ({
  page,
}) => {
  const errors = watchErrors(page);
  await page.goto('/bean-there', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('link', { name: /About Bean There/ })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole('tab', { name: 'All categories' })).toBeVisible();
  await expect(page.getByText('Pickup in 15 min')).toBeVisible();
  // No table home here: the services list belongs to table guests.
  await expect(page.getByText('At your table')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/online-menu.png' });

  await addFirstDish(page);
  await page.getByRole('button', { name: /View order/ }).click();
  await page.getByRole('textbox', { name: 'Your name' }).fill('Ama');
  await page.getByRole('textbox', { name: 'Phone number' }).fill('024 123 4567');
  // Pickup is paid in the app: the order goes, then the Payment step (payment-step.spec.ts).
  await page.getByRole('button', { name: /^Continue to payment/ }).click();
  await expect(page).toHaveURL(/\/bean-there\/pay$/, { timeout: 15_000 });
  await expect(page.getByText(/unauthori[sz]ed|errors\./i)).toHaveCount(0);
  expect(errors).toEqual([]);
});

test(
  'a table QR opens the table home with its list first, and stays on the table address',
  SERVER,
  async ({ page }) => {
    await page.goto('/bean-there/t/7', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('At your table')).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/bean-there\/t\/7$/);
    await page.getByRole('button', { name: /^Menu/ }).first().click();
    await expect(page).toHaveURL(/\/bean-there\/menu$/, { timeout: 15_000 });
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await expect(page).toHaveURL(/\/bean-there\/t\/7$/, { timeout: 15_000 });
    await expect(page.getByText('At your table')).toBeVisible({ timeout: 15_000 });
  },
);

test(
  'opening the menu link after a table scan orders online, never to that table',
  SERVER,
  async ({ page }) => {
    await page.goto('/bean-there/t/7', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('At your table')).toBeVisible({ timeout: 15_000 });
    await page.goto('/bean-there', { waitUntil: 'domcontentloaded' });
    await addFirstDish(page);
    await page.getByRole('button', { name: /View order/ }).click();
    // The online checkout asks for contact details; a table order wouldn't.
    await expect(page.getByRole('textbox', { name: 'Your name' })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Table 7/)).toHaveCount(0);
  },
);

test(
  'a venue that takes no online orders: its link is a menu to browse, with no basket',
  SERVER,
  async ({ page }) => {
    await page.goto('/auntie-akos', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('tab', { name: 'All categories' })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole('tab', { name: 'All categories' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Add .+ to your order$/ })).toHaveCount(0);
    // The same dish from a table scan can be ordered.
    await page.goto('/auntie-akos/t/7', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /^Menu/ }).first().click({ timeout: 15_000 });
    await expect(
      page.getByRole('button', { name: /^Add .+ to your order$/ }).first(),
    ).toBeVisible();
  },
);
