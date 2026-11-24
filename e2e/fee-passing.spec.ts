import { expect, test, type Page } from '@playwright/test';
import { signIn } from './signIn';

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

  await signIn(page, 'Kojo');

  await goInApp(page, '/owner/integrations');
  await expect(page.getByText('Pass fees to customers')).toBeVisible({ timeout: 15_000 });
  // A click that lands before the settings have loaded does nothing (seen on slow CI runners), so
  // click again until the switch reacts. It only clicks while the fee note isn't showing.
  const feeNote = page.getByText(/^On a GH₵100 bill, guests pay GH₵1\.99 more\./);
  await expect(async () => {
    if (!(await feeNote.isVisible())) {
      await page.getByRole('switch', { name: 'Pass fees to customers' }).click();
    }
    await expect(feeNote).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 15_000 });
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
  // The fee shows on the order page, before the guest places the order.
  await expect(page.getByText('Payment fee')).toBeVisible({ timeout: 15_000 });
  await page.getByText('Payment fee').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/fee-passing-pay.png' });
  await page.getByRole('button', { name: 'Place order', exact: true }).click();
  // The mock's stand-in for Paystack's page.
  await page.getByRole('button', { name: 'Pay', exact: true }).click({ timeout: 15_000 });
  await expect(page.getByText('Paid. Your order is with the kitchen.')).toBeVisible({
    timeout: 25_000,
  });
  await page.getByRole('button', { name: 'See receipt' }).click();
  await expect(page.getByText('Payment fee')).toBeVisible({ timeout: 15_000 });
  await page.screenshot({ path: 'test-results/fee-passing-receipt.png', fullPage: true });

  expect(errors).toEqual([]);
});
