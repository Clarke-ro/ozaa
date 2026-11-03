import { expect, test, type Page } from '@playwright/test';

// The owner's phone tabs (see tabsFor in src/features/owner/chrome/nav.ts).
const tabs = [
  ['Today', 'owner-dashboard'],
  ['Orders', 'owner-orders'],
  ['Menu', 'owner-menu'],
  ['Loyalty', 'owner-loyalty'],
] as const;

// Everything else the owner reaches from More. Previews are labelled "<name>, Preview".
// Payments and the Register preview are off in this build (PAYMENTS_ENABLED=false).
const moreItems = [
  ['Floor', 'owner-floor'],
  ['Calls', 'owner-calls'],
  ['Scan and stamp', 'owner-scan'],
  ['Tables and QR', 'owner-tables'],
  ['Branding', 'owner-branding'],
  ['Services', 'owner-services'],
  ['Social links', 'owner-socials'],
  ['Custom links', 'owner-links'],
  ['Feedback', 'owner-feedback'],
  ['Reviews', 'owner-reviews'],
  ['Insights', 'owner-insights'],
  ['Staff', 'owner-staff'],
  ['Scanner devices', 'owner-devices'],
  ['Business and locations', 'owner-business'],
  ['Setup', 'owner-setup'],
  ['Settings', 'owner-settings'],
  ['Stock, Preview', 'owner-stock'],
  ['AI waiter, Preview', 'owner-ai'],
  ['Marketing, Preview', 'owner-marketing'],
] as const;

async function waitLoaded(page: Page) {
  await page.waitForTimeout(350);
  await expect(page.getByRole('progressbar')).toHaveCount(0, { timeout: 10_000 });
  await page.waitForTimeout(250);
}

async function signInAsOwner(page: Page, wide = false) {
  await page.goto('/owner/login', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Owner sign in')).toBeVisible();
  await page.getByRole('button', { name: 'Send code', exact: true }).click();
  const codeBox = page.getByRole('textbox', { name: 'Code', exact: true });
  await expect(codeBox).toBeVisible();
  await codeBox.fill('123456');
  await page.getByRole('button', { name: 'Enter', exact: true }).click();
  // Phones get a tab bar; wide screens get the sidebar, where items are plain buttons.
  await expect(
    page.getByRole(wide ? 'button' : 'tab', { name: 'Today', exact: true }),
  ).toBeVisible();
  await waitLoaded(page);
}

test('owner screens on phone (390x844): every tab and every More item opens, with a way back', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signInAsOwner(page);
  for (const [label, name] of tabs) {
    await page.getByRole('tab', { name: label, exact: true }).click();
    await waitLoaded(page);
    // Tabs are roots: no back button.
    await expect(page.getByRole('button', { name: 'Back', exact: true })).toHaveCount(0);
    await page.screenshot({ path: `test-results/${name}-phone.png`, fullPage: false });
  }
  for (const [label, name] of moreItems) {
    await page.getByRole('tab', { name: 'More', exact: true }).click();
    await waitLoaded(page);
    await page.getByRole('button', { name: label, exact: true }).click();
    await waitLoaded(page);
    if (name === 'owner-tables') {
      await page
        .getByRole('radio', { name: /Table 1/ })
        .first()
        .click();
    }
    await page.screenshot({ path: `test-results/${name}-phone.png`, fullPage: false });
    // Detail screens get a back button that returns to More.
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await expect(
      page.getByRole('tab', { name: 'More', exact: true, selected: true }),
    ).toBeVisible();
  }
});

test('owner screens on tablet (1024x768) use the sidebar', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await signInAsOwner(page, true);
  for (const [label, name] of [...tabs, ...moreItems.filter(([l]) => !l.endsWith('Preview'))]) {
    await page.getByRole('button', { name: label, exact: true }).first().click();
    await waitLoaded(page);
    await page.screenshot({ path: `test-results/${name}-tablet.png`, fullPage: false });
  }
});
