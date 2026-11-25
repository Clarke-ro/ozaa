import { expect, test, type Page } from '@playwright/test';
import { signIn as signInStaff } from './signIn';
import { SERVER } from './tags';

// Integrations cards open when switched on and close back to their row once saved; the header
// opens them again (Clarke, 2026-11-16). Kojo owns Bean There, which has Paystack test keys.

async function signInAsKojo(page: Page) {
  await signInStaff(page, 'Kojo');
  await page.evaluate(() => {
    window.history.pushState({}, '', '/owner/integrations');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page.getByText('Bank transfer')).toBeVisible({ timeout: 15_000 });
}

test(
  'bank transfer: switching it on opens its page, saving turns it on, and the card opens it again',
  SERVER,
  async ({ page }) => {
    await signInAsKojo(page);
    // Settings live on their own page (Clarke, 25 Nov 2026). No details yet, so the switch goes there.
    await page.getByRole('switch', { name: 'Bank transfer' }).click();
    await expect(page).toHaveURL(/\/owner\/integrations\/bank$/);
    await page.getByRole('textbox', { name: 'Bank', exact: true }).fill('GCB Bank');
    await page.getByRole('textbox', { name: 'Account name' }).fill('Bean There Ltd');
    await page.getByRole('textbox', { name: 'Account number' }).fill('1234567890');
    await page.getByRole('button', { name: 'Save bank details' }).click();

    await expect(page).toHaveURL(/\/owner\/integrations$/, { timeout: 15_000 });
    await expect(page.getByRole('switch', { name: 'Bank transfer' })).toBeChecked();

    await page.getByRole('button', { name: 'Open Bank transfer settings' }).click();
    await expect(page.getByRole('textbox', { name: 'Account number' })).toHaveValue('1234567890');
  },
);

test('passing fees: picking a share on its page turns it on', SERVER, async ({ page }) => {
  await signInAsKojo(page);
  await page.getByRole('button', { name: 'Open Pass fees to customers settings' }).click();
  await expect(page).toHaveURL(/\/owner\/integrations\/fees$/);
  await page.getByRole('radio', { name: '50%' }).click();
  await expect(page).toHaveURL(/\/owner\/integrations$/, { timeout: 15_000 });
  await expect(page.getByRole('switch', { name: 'Pass fees to customers' })).toBeChecked();
});
