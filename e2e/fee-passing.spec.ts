import { expect, test, type Page } from '@playwright/test';

// BUILD.md 2.10: the owner passes Paystack's fee to guests, and a guest sees it as its own line
// before paying and on the receipt. Bean There is the sample venue with Paystack test keys; Kojo
// is its owner. The mock lives in the browser, so the test moves to the guest pages without a
// full page load (that would start the mock afresh and forget the owner's change).

async function goInApp(page: Page, path: string) {
  await page.evaluate((to) => {
    window.history.pushState({}, '', to);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, path);
}

test('owner passes the whole fee; the guest sees a Payment fee line before paying and on the receipt', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/owner/login', { waitUntil: 'domcontentloaded' });
  await page.getByRole('textbox', { name: 'Phone number' }).fill('024 000 0004');
  await page.getByRole('button', { name: 'Send code', exact: true }).click();
  await page.getByRole('textbox', { name: 'Code', exact: true }).fill('123456');
  await page.getByRole('button', { name: 'Enter', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Today', exact: true })).toBeVisible({
    timeout: 15_000,
  });

  await goInApp(page, '/owner/integrations');
  await expect(page.getByText('Pass fees to customers')).toBeVisible({ timeout: 15_000 });
  await page.getByRole('switch', { name: 'Pass fees to customers' }).click();
  await expect(page.getByText(/^On a GH₵100 bill, guests pay GH₵1\.99 more\./)).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole('switch', { name: 'Pass fees to customers' })).toBeChecked();
  await page.waitForTimeout(400); // let the switch finish sliding before the screenshot
  await page.screenshot({ path: 'test-results/fee-passing-owner.png' });

  await goInApp(page, '/bean-there/t/7');
  await page.getByRole('button', { name: /^Menu/ }).first().click();
  await page
    .getByRole('button', { name: /^Add .+ to your order$/ })
    .first()
    .click();
  await page.getByRole('button', { name: /View order/ }).click();
  await page.getByRole('button', { name: /^Continue to payment/ }).click();

  await expect(page.getByText('Payment fee')).toBeVisible({ timeout: 15_000 });
  await page.getByText('Payment fee').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/fee-passing-pay.png' });
  await page.getByRole('textbox', { name: 'MoMo number' }).fill('0241234567');
  await page.getByRole('button', { name: /^Pay GH/ }).click();
  await expect(page.getByText('Paid. Your order is with the kitchen.')).toBeVisible({
    timeout: 25_000,
  });
  await page.getByRole('button', { name: 'See receipt' }).click();
  await expect(page.getByText('Payment fee')).toBeVisible({ timeout: 15_000 });
  await page.screenshot({ path: 'test-results/fee-passing-receipt.png', fullPage: true });

  expect(errors).toEqual([]);
});
