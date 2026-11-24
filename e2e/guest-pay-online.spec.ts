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
  await expect(page.getByText('Paid. Your order is with the kitchen.')).toBeVisible({
    timeout: 20_000,
  });
  await page.screenshot({ path: 'test-results/pay-online-paid.png' });

  // The receipt: the bill, what this guest paid, and a clear test label.
  await page.getByRole('button', { name: 'See receipt' }).click();
  await expect(page.getByText('Test payment. No money moved.')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('You paid')).toBeVisible();
  await expect(page.getByText(/^Reference pay_/)).toBeVisible();
  await page.screenshot({ path: 'test-results/pay-receipt.png', fullPage: true });
  await page.getByRole('button', { name: 'Back to your order' }).click();
  await expect(page.getByText('Not paid yet')).toHaveCount(0, { timeout: 15_000 });

  expect(errors).toEqual([]);
});

/**
 * Order at Bean There, then come back from the payment page without paying, so the Pay page
 * offers a direct MoMo charge (approve on your phone). That path stays for paying an order later.
 */
async function openPayForm(page: import('@playwright/test').Page) {
  await page.goto('/bean-there/t/7', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /^Menu/ }).first().click();
  await page
    .getByRole('button', { name: /^Add .+ to your order$/ })
    .first()
    .click();
  await page.getByRole('button', { name: /View order/ }).click();
  await page.getByRole('button', { name: 'Place order', exact: true }).click();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Try again' }).click({ timeout: 20_000 });
}

test('guest MoMo payment that fails: says why, nothing taken, and Try again goes back', async ({
  page,
}) => {
  await openPayForm(page);

  // The mock fails any MoMo number ending in 0 ("Not enough money in the wallet.").
  await page.getByRole('textbox', { name: 'MoMo number' }).fill('0241234560');
  await page.getByRole('button', { name: /^Pay GH/ }).click();
  await expect(page.getByText("That didn't go through")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('Not enough money in the wallet.')).toBeVisible();
  await page.screenshot({ path: 'test-results/pay-online-failed.png' });

  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('button', { name: /^Pay GH/ })).toBeVisible();
});

test('guest MoMo payment nobody approves: after 0:00 the app checks, then Time ran out', async ({
  page,
}) => {
  // A fake clock lets the test jump past the 3-minute countdown instead of waiting for it.
  await page.clock.install();
  await openPayForm(page);

  // The mock never approves a MoMo number ending in 9; it expires at 3:00.
  await page.getByRole('textbox', { name: 'MoMo number' }).fill('0241234569');
  await page.getByRole('button', { name: /^Pay GH/ }).click();
  await expect(page.getByText('Approve on your phone')).toBeVisible({ timeout: 15_000 });

  await page.clock.runFor('02:59');
  await expect(page.getByText('0:01')).toBeVisible();
  // At 0:00 the app checks with the server (Still checking…), which can be too quick to catch
  // when the mock answers at once. What matters is where it ends up.
  await page.clock.runFor(1_000);

  await page.clock.runFor('00:20');
  await expect(page.getByText('Time ran out')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  await page.screenshot({ path: 'test-results/pay-online-timed-out.png' });
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
  await expect(page.getByText('Paid. Your order is with the kitchen.')).toBeVisible({
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
  await expect(page.getByText("The card payment didn't finish. Nothing was taken.")).toBeVisible();
  await page.screenshot({ path: 'test-results/pay-card-cancelled.png' });
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('button', { name: /^Pay GH/ })).toBeVisible();
});
