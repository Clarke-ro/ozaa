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
  await page.getByRole('button', { name: 'Send to kitchen' }).click();

  await expect(page.getByText('Not paid yet')).toBeVisible({ timeout: 15_000 });
  await page.screenshot({ path: 'test-results/pay-online-status.png' });
  await page.getByRole('button', { name: 'Pay & split bill' }).click();

  await expect(page.getByText('Test payment')).toBeVisible({ timeout: 15_000 });
  // The mock approves any MoMo number that doesn't end in 0 or 9, five seconds after it starts.
  await page.getByRole('textbox', { name: 'MoMo number' }).fill('0241234567');
  await page.screenshot({ path: 'test-results/pay-online-pay.png' });
  await page.getByRole('button', { name: /^Pay GH/ }).click();
  await expect(page.getByText('Approve on your phone')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Check your phone and enter your PIN to approve.')).toBeVisible();
  // The countdown starts at 3:00 and ticks down.
  await expect(page.getByText(/^[0-3]:[0-5]\d$/)).toBeVisible();
  await page.screenshot({ path: 'test-results/pay-online-waiting.png' });
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

test('guest MoMo payment that fails: says why, nothing taken, and Try again goes back', async ({
  page,
}) => {
  await page.goto('/bean-there/t/7', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /^Menu/ }).first().click();
  await page
    .getByRole('button', { name: /^Add .+ to your order$/ })
    .first()
    .click();
  await page.getByRole('button', { name: /View order/ }).click();
  await page.getByRole('button', { name: 'Send to kitchen' }).click();
  await page.getByRole('button', { name: 'Pay & split bill' }).click();

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
  await page.goto('/bean-there/t/7', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /^Menu/ }).first().click();
  await page
    .getByRole('button', { name: /^Add .+ to your order$/ })
    .first()
    .click();
  await page.getByRole('button', { name: /View order/ }).click();
  await page.getByRole('button', { name: 'Send to kitchen' }).click();
  await page.getByRole('button', { name: 'Pay & split bill' }).click();

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

// Order at Bean There, open Pay and choose card.
async function payByCard(page: import('@playwright/test').Page) {
  await page.goto('/bean-there/t/7', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /^Menu/ }).first().click();
  await page
    .getByRole('button', { name: /^Add .+ to your order$/ })
    .first()
    .click();
  await page.getByRole('button', { name: /View order/ }).click();
  await page.getByRole('button', { name: 'Send to kitchen' }).click();
  await page.getByRole('button', { name: 'Pay & split bill' }).click();
  await page.getByRole('radio', { name: 'Debit or credit card' }).click();
  await page.getByRole('button', { name: /^Pay GH/ }).click();
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
