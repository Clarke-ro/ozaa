import { expect, test, type Page } from '@playwright/test';

// Integrations cards open when switched on and close back to their row once saved; the header
// opens them again (Clarke, 2026-11-16). Kojo owns Bean There, which has Paystack test keys.

async function signInAsKojo(page: Page) {
  await page.goto('/owner/login', { waitUntil: 'domcontentloaded' });
  await page.getByRole('textbox', { name: 'Phone number' }).fill('024 000 0004');
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
  await expect(page.getByText('Bank transfer')).toBeVisible({ timeout: 15_000 });
}

test('bank transfer opens when switched on, closes after saving, and the header reopens it', async ({
  page,
}) => {
  await signInAsKojo(page);
  const accountNumber = page.getByRole('textbox', { name: 'Account number' });
  await expect(accountNumber).toHaveCount(0);

  await page.getByRole('switch', { name: 'Bank transfer' }).click();
  await expect(accountNumber).toBeVisible();
  await page.getByRole('textbox', { name: 'Bank', exact: true }).fill('GCB Bank');
  await page.getByRole('textbox', { name: 'Account name' }).fill('Bean There Ltd');
  await accountNumber.fill('1234567890');
  await page.getByRole('button', { name: 'Save bank details' }).click();

  await expect(page.getByText('Saved').first()).toBeVisible({ timeout: 15_000 });
  await expect(accountNumber).toHaveCount(0);
  await expect(page.getByRole('switch', { name: 'Bank transfer' })).toBeChecked();

  await page.getByRole('button', { name: 'Show Bank transfer details' }).click();
  await expect(page.getByRole('textbox', { name: 'Account number' })).toHaveValue('1234567890');
});

test('passing fees closes once a share is picked', async ({ page }) => {
  await signInAsKojo(page);
  await page.getByRole('switch', { name: 'Pass fees to customers' }).click();
  await expect(page.getByRole('radio', { name: '50%' })).toBeVisible({ timeout: 15_000 });
  await page.getByRole('radio', { name: '50%' }).click();
  await expect(page.getByRole('radio', { name: '50%' })).toHaveCount(0, { timeout: 15_000 });
  await expect(page.getByRole('switch', { name: 'Pass fees to customers' })).toBeChecked();
});
