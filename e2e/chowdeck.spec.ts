import { expect, test, type Page } from '@playwright/test';
import { signIn } from './signIn';

// BUILD.md 5b.4: Chowdeck on Integrations > Delivery apps, on the mock. Test keys only; the mock
// finishes a send after 3 s, as the connector will (api/MOCKS.md). Set SHOTS_DIR for screenshots.
const shots = process.env.SHOTS_DIR;

async function shot(page: Page, name: string) {
  if (!shots) return;
  await page.waitForTimeout(400);
  const project = test.info().project.name;
  await page.screenshot({ path: `${shots}/${project ? `${project}-` : ''}${name}.png` });
}

test('connect Chowdeck, switch it on, set a price rule and publish the menu', async ({ page }) => {
  await signIn(page, 'Ama', { wide: (page.viewportSize()?.width ?? 0) >= 1024 });
  await page.evaluate(() => {
    window.history.pushState({}, '', '/owner/integrations');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page.getByText('Delivery apps', { exact: true })).toBeVisible({ timeout: 15_000 });
  await shot(page, 'integrations');

  // Not connected: the switch opens Chowdeck's own page for the keys.
  await page.getByRole('switch', { name: 'Chowdeck' }).click();
  await expect(page).toHaveURL(/\/owner\/integrations\/chowdeck$/);
  await page.getByRole('textbox', { name: 'Store reference' }).fill('mamas-osu');
  await page.getByRole('textbox', { name: 'Secret key', exact: true }).fill('chowtestkey12345');
  await page.getByRole('textbox', { name: 'Webhook secret' }).fill('hooktestsecret12');
  await shot(page, 'chowdeck-keys');
  await page.getByRole('button', { name: 'Connect Chowdeck' }).click();
  await expect(page.getByText('Chowdeck connected')).toBeVisible();

  // Connected, on the same page: off until switched on, then the settings and Publish. The list
  // stays loaded behind the page on the web, so checks look only at what is visible.
  const send = page.getByRole('switch', { name: 'Chowdeck' }).filter({ visible: true });
  await expect(send).not.toBeChecked();
  await send.click();
  await expect(page.getByText('Not sent yet').filter({ visible: true })).toBeVisible();
  await expect(page.getByText(/\/webhooks\/chowdeck$/).filter({ visible: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Add to prices (%)' }).fill('20');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Add to prices (%)' })).toHaveValue('20');

  await page.getByRole('button', { name: 'Publish menu' }).click();
  await expect(page.getByText('Sending…', { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(page.getByText(/^Sent \d\d:\d\d$/).filter({ visible: true })).toBeVisible({
    timeout: 15_000,
  });
  await shot(page, 'chowdeck-page');

  // Back on Integrations, the card says the same.
  // Wide screens have a Back link; phones use the system back gesture (Clarke, 14 Nov 2026).
  if ((page.viewportSize()?.width ?? 0) >= 1024) {
    await page.getByRole('button', { name: 'Integrations', exact: true }).first().click();
  } else {
    await page.goBack();
  }
  await expect(page.getByText(/^Sent \d\d:\d\d$/).filter({ visible: true })).toBeVisible({
    timeout: 15_000,
  });
  await shot(page, 'integrations-after');
});
