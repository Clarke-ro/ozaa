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
  await expect(page.getByText('Check your phone and enter your PIN to approve.')).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText('Paid. Your order is with the kitchen.')).toBeVisible({
    timeout: 20_000,
  });
  await page.screenshot({ path: 'test-results/pay-online-paid.png' });

  expect(errors).toEqual([]);
});
