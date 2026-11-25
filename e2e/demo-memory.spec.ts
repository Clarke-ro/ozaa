import { expect, test } from '@playwright/test';

// The demo keeps an owner's settings on the device: connecting Paystack, then reloading, must
// still give guests the payment flow (Clarke, 2026-11-16: his changes "didn't go through").
test('an owner connects Paystack, and after a reload guests can pay in the app', async ({
  page,
}) => {
  // Akosua runs Auntie Akos, the sample with no Paystack yet.
  await page.goto('/owner/login', { waitUntil: 'domcontentloaded' });
  await page.getByRole('textbox', { name: 'Phone number' }).fill('024 000 0005');
  await page.getByRole('button', { name: 'Send code', exact: true }).click();
  await page.getByRole('textbox', { name: 'Code', exact: true }).fill('123456');
  await page.getByRole('button', { name: 'Enter', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Today', exact: true })).toBeVisible({
    timeout: 15_000,
  });
  await page.evaluate(() => {
    window.history.pushState({}, '', '/owner/integrations');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await page.getByRole('switch', { name: 'Paystack' }).click({ timeout: 15_000 });
  await page.getByRole('textbox', { name: 'Public key' }).fill('pk_test_auntieakos000001');
  await page.getByRole('textbox', { name: 'Secret key' }).fill('sk_test_auntieakos000001');
  await page.getByRole('button', { name: 'Connect Paystack' }).click();
  // Connecting returns to Integrations, where the Paystack switch is now on (cards show no status
  // words since 25 Nov 2026). The list stays loaded behind pages on the web, so only the shown one.
  await expect(
    page.getByRole('switch', { name: 'Paystack' }).filter({ visible: true }),
  ).toBeChecked({ timeout: 15_000 });
  // Saving happens a moment after the change.
  await page.waitForTimeout(800);

  // A full page load starts the demo afresh, yet the connection is still there.
  await page.goto('/auntie-akos/t/7', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /^Menu/ }).first().click({ timeout: 15_000 });
  await page
    .getByRole('button', { name: /^Add .+ to your order$/ })
    .first()
    .click({ timeout: 15_000 });
  await page.getByRole('button', { name: /View order/ }).click();
  await expect(page.getByRole('button', { name: 'Place order', exact: true })).toBeVisible({
    timeout: 15_000,
  });
});
