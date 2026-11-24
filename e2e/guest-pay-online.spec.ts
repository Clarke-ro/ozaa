import { expect, test } from '@playwright/test';

// BUILD.md 4b.17: guests pay in the app only where the venue connected its own Paystack. In the
// sample data Bean There has test keys connected; Mama's Kitchen takes payment in person
// (pay-in-person.spec.ts covers that side).

test('guest at a venue with Paystack: order, pay by MoMo in test mode, and see it paid', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/bean-there/t/7', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Call waiter').first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Pay & split bill').first()).toBeVisible();
  await page.screenshot({ path: 'test-results/pay-online-home.png' });

  // Move inside the app: a full page load restarts the in-browser mock and forgets the table.
  await page.getByRole('button', { name: /^Menu/ }).first().click();
  await page
    .getByRole('button', { name: /^Add .+ to your order$/ })
    .first()
    .click();
  await page.getByRole('button', { name: /View order/ }).click();
  // The order page takes payment too (Clarke, 2026-11-23). MoMo is picked to start.
  await expect(page.getByText('Test payment')).toBeVisible({ timeout: 15_000 });
  await page.screenshot({ path: 'test-results/pay-online-pay.png' });
  await page.getByRole('button', { name: 'Place order', exact: true }).click();
  // The mock's stand-in for Paystack's page, where the guest approves MoMo.
  await page.getByRole('button', { name: 'Pay', exact: true }).click({ timeout: 15_000 });
  await expect(page.getByRole('heading', { name: 'Order paid' })).toBeVisible({
    timeout: 20_000,
  });
  await page.screenshot({ path: 'test-results/pay-online-paid.png' });

  // The receipt: the bill, what this guest paid, and a clear test label.
  await page.getByRole('button', { name: 'Get the receipt' }).click();
  await expect(page.getByText('Test payment. No money moved.')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('You paid')).toBeVisible();
  await expect(page.getByText(/^Reference pay_/)).toBeVisible();
  await page.screenshot({ path: 'test-results/pay-receipt.png', fullPage: true });
  await page.getByRole('button', { name: 'Back to your order' }).click();
  await expect(page.getByText('Not paid yet')).toHaveCount(0, { timeout: 15_000 });

  expect(errors).toEqual([]);
});

test('a guest who leaves the payment page can pay later from the Pay page', async ({ page }) => {
  await page.goto('/bean-there/t/7', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /^Menu/ }).first().click();
  await page
    .getByRole('button', { name: /^Add .+ to your order$/ })
    .first()
    .click();
  await page.getByRole('button', { name: /View order/ }).click();
  await page.getByRole('button', { name: 'Place order', exact: true }).click();
  // The mock's stand-in for Paystack's page: leave without paying.
  await page.getByRole('button', { name: 'Cancel', exact: true }).click({ timeout: 15_000 });
  await expect(page.getByRole('heading', { name: 'Not paid', exact: true })).toBeVisible({
    timeout: 20_000,
  });
  await page.getByRole('button', { name: 'Try again' }).click();
  // The Pay page: the same choices as the order page, then Paystack's page again.
  await expect(page.getByRole('radio', { name: /^MoMo/ })).toBeChecked();
  await page.getByRole('button', { name: /^Pay GH/ }).click();
  await page.getByRole('button', { name: 'Pay', exact: true }).click({ timeout: 15_000 });
  await expect(page.getByRole('heading', { name: 'Order paid' })).toBeVisible({ timeout: 20_000 });
  await page.screenshot({ path: 'test-results/pay-online-retry-paid.png', fullPage: true });
});

// Order at Bean There and pay by card on the order page.
async function payByCard(page: import('@playwright/test').Page) {
  await page.goto('/bean-there/t/7', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /^Menu/ }).first().click();
  await page
    .getByRole('button', { name: /^Add .+ to your order$/ })
    .first()
    .click();
  await page.getByRole('button', { name: /View order/ }).click();
  await page.getByRole('radio', { name: /^Card/ }).click();
  await page.getByRole('button', { name: 'Place order', exact: true }).click();
}

test('guest pays by card: the card page sends them back and the app shows it paid', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await payByCard(page);

  // The mock's stand-in for Paystack's card page, then back to /bean-there/pay?reference=…
  await page.getByRole('button', { name: 'Pay', exact: true }).click();
  await expect(page).toHaveURL(/\/bean-there\/pay\?reference=/, { timeout: 15_000 });
  await expect(page.getByRole('heading', { name: 'Order paid' })).toBeVisible({
    timeout: 20_000,
  });
  await page.screenshot({ path: 'test-results/pay-card-paid.png' });
  expect(errors).toEqual([]);
});

test('guest cancels on the card page: Not paid, nothing taken, Try again', async ({ page }) => {
  await payByCard(page);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Not paid', exact: true })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText("The payment didn't finish. Nothing was taken.")).toBeVisible();
  await page.screenshot({ path: 'test-results/pay-card-cancelled.png' });
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('button', { name: /^Pay GH/ })).toBeVisible();
});
