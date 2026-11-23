import { expect, test, type Page } from '@playwright/test';
import { signIn as signInStaff } from './signIn';

// Tap to open: the owner writes a table's link onto an NFC tag from the Tables page. Chrome on
// Android has NDEFReader; here a stand-in records what would be written, so the test can check
// the tag gets the same link as the table's QR code.

async function signIn(page: Page) {
  await signInStaff(page);
  await page.evaluate(() => {
    window.history.pushState({}, '', '/owner/tables');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
}

test('on a phone with Web NFC, a table link is written to the tag', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { NDEFReader: unknown; written: unknown[] };
    w.written = [];
    w.NDEFReader = class {
      async write(message: unknown) {
        w.written.push(message);
      }
    };
  });
  await signIn(page);
  await page
    .getByRole('button', { name: /^Write .+ to an NFC tag$/ })
    .first()
    .click();
  await page.getByRole('button', { name: 'Write tag' }).click();
  await expect(page.getByText(/^Done\. Tap the tag/)).toBeVisible();
  const written = await page.evaluate(() => (window as unknown as { written: unknown[] }).written);
  expect(written).toEqual([
    { records: [{ recordType: 'url', data: expect.stringMatching(/\/mamas-kitchen\/t\/[^/]+$/) }] },
  ]);
  await page.getByRole('button', { name: 'Done' }).click();
});

test('without Web NFC, the sheet shows the link to copy into an NFC app', async ({ page }) => {
  await signIn(page);
  await page
    .getByRole('button', { name: /^Write .+ to an NFC tag$/ })
    .first()
    .click();
  await expect(page.getByText(/needs Chrome on an Android phone/)).toBeVisible();
  await expect(page.getByText(/\/mamas-kitchen\/t\//)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy link' })).toBeVisible();
});

test('cards with an NFC tag say scan or tap', async ({ page }) => {
  await signIn(page);
  await expect(page.getByText('Scan or tap to order').first()).toBeHidden();
  await page.getByRole('switch', { name: 'Cards with an NFC tag' }).click();
  await expect(page.getByText(/Scan or tap your phone here/).first()).toBeVisible();
});
