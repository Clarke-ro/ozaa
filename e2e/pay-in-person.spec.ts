import { expect, test, type Page } from '@playwright/test';
import { signIn as signInStaff } from './signIn';
import { SERVER } from './tags';
import { placeOrder } from './sampleData';

// A venue without Paystack (Auntie Akos in the samples): guests pay in person and staff mark the
// bill paid. Nothing a guest or
// an owner can reach should offer the old in-app payment or payout screens.
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

test(
  'guest at a venue with no Paystack: order, ask for the bill, and never see a payment screen',
  SERVER,
  async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/auntie-akos/t/7', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Call waiter').first()).toBeVisible({ timeout: 15_000 });
    await noPayWords(page);
    await page.screenshot({ path: 'test-results/pay-in-person-guest-home.png' });

    // Move inside the app: a full page load restarts the in-browser mock and forgets the table.
    await page.getByRole('button', { name: /^Menu/ }).first().click();
    await page
      .getByRole('button', { name: /^Add .+ to your order$/ })
      .first()
      .click();
    await page.getByRole('button', { name: /View order/ }).click();
    await page.getByRole('button', { name: 'Send to kitchen' }).click();

    // The order lands on its status page as "pay at the counter", with no Pay button.
    await expect(
      page.getByText('Pay at the counter, or ask your waiter for the bill.'),
    ).toBeVisible({
      timeout: 15_000,
    });
    await noPayWords(page);
    await page.screenshot({ path: 'test-results/pay-in-person-guest-status.png' });

    // Asking for the bill is a waiter call, nothing more.
    await page.getByRole('button', { name: 'Call waiter' }).first().click();
    await page.getByRole('checkbox', { name: 'The bill' }).click();
    await page.getByRole('button', { name: 'Call waiter' }).last().click();
    await expect(page.getByText('Your requests')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/^Waiting, sent/)).toBeVisible();
    await noPayWords(page);
    await page.screenshot({ path: 'test-results/pay-in-person-guest-bill.png' });

    // An old Pay link goes to the order instead of a 404.
    await page.goto('/auntie-akos/pay', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/auntie-akos\/status$/, { timeout: 15_000 });

    expect(errors).toEqual([]);
  },
);

async function signInAsOwner(page: Page) {
  await signInStaff(page);
}

test(
  'owner: Today leads with sales, and a served table is marked paid from Floor',
  SERVER,
  async ({ page, request }) => {
    const errors = watchErrors(page);
    await placeOrder(request, 'mamas-kitchen', '3');
    await signInAsOwner(page);
    await expect(page.getByText('Sales today').first()).toBeVisible({ timeout: 15_000 });
    await page.screenshot({ path: 'test-results/pay-in-person-owner-today.png' });

    // The old payout page is gone from the menu; payments are set up in Integrations.
    await page.getByRole('tab', { name: 'More', exact: true }).click();
    await expect(page.getByRole('button', { name: /^Payments/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Integrations/ }).first()).toBeVisible();
    await page
      .getByRole('button', { name: /^Floor/ })
      .first()
      .click();

    // Serve table 3's order from its sheet. Once served and unpaid, its card says it is waiting
    // for the bill.
    const table3 = page.getByRole('button', { name: /^Table 3,/ });
    const waitingForBill = page.getByRole('button', { name: /^Table 3, Waiting for the bill/ });
    await expect(table3).toBeVisible({ timeout: 15_000 });
    await expect(waitingForBill).toHaveCount(0);
    await table3.click();
    for (const step of ['Accept order', 'Start cooking', 'Mark ready', 'Mark served']) {
      await page.getByRole('button', { name: step }).click();
    }
    await expect(waitingForBill).toBeVisible({ timeout: 15_000 });
    // The table's sheet is still open; its own Mark paid closes it and asks how it was paid.
    await page.getByRole('dialog').getByRole('button', { name: 'Mark paid' }).click();
    await expect(page.getByText(/^How did order #\d+ pay\?$/)).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(600); // let the sheet finish sliding in before the screenshot
    await page.screenshot({ path: 'test-results/pay-in-person-owner-mark-paid.png' });
    await page.getByRole('button', { name: 'Cash' }).click();
    await expect(page.getByText(/^Order #\d+ marked paid$/)).toBeVisible({ timeout: 15_000 });
    await expect(waitingForBill).toHaveCount(0, { timeout: 15_000 });
    await page.screenshot({ path: 'test-results/pay-in-person-owner-floor.png' });

    // Old links to the payout page land on Integrations.
    await page.goto('/owner/payments', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/owner\/(integrations|login)/, { timeout: 15_000 });

    expect(errors).toEqual([]);
  },
);
