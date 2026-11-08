import { expect, test, type Page } from '@playwright/test';

// This build ships with PAYMENTS_ENABLED=false (docs/payments-removed.md). Nothing a guest or an
// owner can reach should offer to take, track or report money paid.
const PAY_WORDS = /Pay & split bill|MoMo or card|Mark paid in cash|Payouts?\b|Refund/;

async function noPayWords(page: Page) {
  await expect(page.getByText(PAY_WORDS)).toHaveCount(0);
}

function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}

test('guest: scan a table, order, ask for the bill, and never see a payment screen', async ({
  page,
}) => {
  const errors = watchErrors(page);
  await page.goto('/mamas-kitchen/t/12', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Call waiter').first()).toBeVisible({ timeout: 15_000 });
  await noPayWords(page);
  await page.screenshot({ path: 'test-results/payments-off-guest-home.png' });

  // Move inside the app: a full page load restarts the in-browser mock and forgets the table.
  await page.getByRole('button', { name: /^Menu/ }).first().click();
  await page
    .getByRole('button', { name: /^Add .+ to your order$/ })
    .first()
    .click();
  await page.getByRole('button', { name: /View order/ }).click();
  await page.getByRole('button', { name: 'Send to kitchen' }).click();

  // The order lands on its status page as "pay at the counter", with no Pay button.
  await expect(page.getByText('Pay at the counter, or ask your waiter for the bill.')).toBeVisible({
    timeout: 15_000,
  });
  await noPayWords(page);
  await page.screenshot({ path: 'test-results/payments-off-guest-status.png' });

  // Asking for the bill is a waiter call, nothing more.
  await page.getByRole('button', { name: 'Call waiter' }).first().click();
  await page.getByRole('checkbox', { name: 'The bill' }).click();
  await page.getByRole('button', { name: 'Call waiter' }).last().click();
  await expect(page.getByText('Your requests')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/^Waiting, sent/)).toBeVisible();
  await noPayWords(page);
  await page.screenshot({ path: 'test-results/payments-off-guest-bill.png' });

  // An old Pay link goes to the order instead of a 404.
  await page.goto('/mamas-kitchen/pay', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/mamas-kitchen\/status$/, { timeout: 15_000 });

  expect(errors).toEqual([]);
});

async function signInAsOwner(page: Page) {
  await page.goto('/owner/login', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Send code', exact: true }).click();
  await page.getByRole('textbox', { name: 'Code', exact: true }).fill('123456');
  await page.getByRole('button', { name: 'Enter', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Today', exact: true })).toBeVisible({
    timeout: 15_000,
  });
}

test('owner: orders, floor, calls and insights work with no payment cards', async ({ page }) => {
  const errors = watchErrors(page);
  await signInAsOwner(page);
  await expect(page.getByText('Pending orders').first()).toBeVisible({ timeout: 15_000 });
  await noPayWords(page);
  await page.screenshot({ path: 'test-results/payments-off-owner-today.png' });

  // Seeded table 3 is served and unpaid. Without payments it is just seated, never "waiting to pay".
  await page.getByRole('tab', { name: 'More', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Payments/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Register/ })).toHaveCount(0);
  await page
    .getByRole('button', { name: /^Floor/ })
    .first()
    .click();
  // The Bill chip carries its count, read out as "Bill, N".
  await expect(page.getByRole('tab', { name: /^Bill, \d+$/ })).toBeVisible({ timeout: 15_000 });
  await noPayWords(page);
  await page.screenshot({ path: 'test-results/payments-off-owner-floor.png' });

  await page.getByRole('tab', { name: 'Orders', exact: true }).click();
  await expect(page.getByText(/^(Not paid|Part paid|Paid)$/)).toHaveCount(0);
  // The seeded water call on table 4 shows on Orders with no payment feed behind it.
  await expect(page.getByText('Water', { exact: true }).first()).toBeVisible({ timeout: 15_000 });
  await page.screenshot({ path: 'test-results/payments-off-owner-orders.png' });

  await page.getByRole('tab', { name: 'More', exact: true }).click();
  await page
    .getByRole('button', { name: /^Insights/ })
    .first()
    .click();
  await expect(page.getByText('Top dishes', { exact: true })).toBeVisible({ timeout: 15_000 });
  // Only what's on screen: the More list (still in the page, hidden) has a Sales page link.
  await expect(page.getByText('Sales', { exact: true }).locator('visible=true')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/payments-off-owner-insights.png' });

  // Old links to payment screens land somewhere useful.
  await page.goto('/owner/payments', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/owner\/(orders|login)/, { timeout: 15_000 });

  expect(errors).toEqual([]);
});
