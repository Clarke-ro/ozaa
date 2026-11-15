import { expect, test, type Page } from '@playwright/test';

// The owner's phone tabs (see tabsFor in src/features/owner/chrome/nav.ts).
const tabs = [
  ['Today', 'owner-dashboard'],
  ['Orders', 'owner-orders'],
  ['Menu', 'owner-menu'],
  ['Loyalty', 'owner-loyalty'],
] as const;

// Everything else the owner reaches from More. Previews are labelled "<name>, Preview".
// The Register preview is off unless PREVIEWS_ENABLED=true; payments are set up in Integrations.
const moreItems = [
  ['Floor', 'owner-floor'],
  ['Calls', 'owner-calls'],
  ['Scan and stamp', 'owner-scan'],
  ['QR codes and links', 'owner-tables'],
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
  ['Settings', 'owner-settings'],
  ['Store notice', 'owner-notice'],
  ['Customers', 'owner-customers'],
  ['Promos and coupons', 'owner-promos'],
  ['Integrations', 'owner-integrations'],
  ['Billing', 'owner-billing'],
  ['Online ordering', 'owner-ordering'],
  ['Sales', 'owner-sales'],
  // The roadmap previews (Stock, AI waiter, Marketing) are off unless PREVIEWS_ENABLED=true.
] as const;

async function waitLoaded(page: Page) {
  await page.waitForTimeout(350);
  // Only the loading skeletons. Other progress bars (the setup checklist on Today) stay on screen.
  await expect(page.getByRole('progressbar', { name: 'Loading', exact: true })).toHaveCount(0, {
    timeout: 10_000,
  });
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
  test.setTimeout(120_000);
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
      // The canvas shows every table's card under All tables, with its own Print and Download.
      await expect(page.getByRole('heading', { name: 'All tables' })).toBeVisible();
    }
    await page.screenshot({ path: `test-results/${name}-phone.png`, fullPage: false });
    // Phones have no Back arrow (Clarke, 2026-11-14): the way back is the system's back (swipe
    // on iPhone, the back gesture on Android, the browser here). Setup stands alone with Close.
    if (name === 'owner-setup') {
      await page.getByRole('button', { name: 'Close', exact: true }).click();
    } else {
      await expect(page.getByRole('button', { name: 'Back', exact: true })).toHaveCount(0);
      await page.goBack();
    }
    await expect(
      page.getByRole('tab', { name: 'More', exact: true, selected: true }),
    ).toBeVisible();
  }
});

test('owner screens on tablet (1024x768) use the sidebar', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await signInAsOwner(page, true);
  // Settings isn't a sidebar row: the owner button at the foot of the sidebar opens it.
  for (const [label, name] of [...tabs, ...moreItems].filter(([label]) => label !== 'Settings')) {
    await page.getByRole('button', { name: label, exact: true }).first().click();
    await waitLoaded(page);
    await page.screenshot({ path: `test-results/${name}-tablet.png`, fullPage: false });
  }
  await page.getByRole('button', { name: /Profile and settings$/ }).click();
  await waitLoaded(page);
  await expect(page.getByRole('button', { name: 'Help', exact: true })).toBeVisible();
});

test('the folded sidebar stays folded on the next page', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await signInAsOwner(page, true);
  await page.getByRole('button', { name: 'Collapse sidebar', exact: true }).click();
  await page.getByRole('button', { name: 'Orders', exact: true }).first().click();
  await waitLoaded(page);
  await expect(page.getByRole('button', { name: 'Expand sidebar', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Expand sidebar', exact: true }).click();
});
