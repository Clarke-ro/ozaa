import { expect, test, type Page } from '@playwright/test';
import { audit, type Finding } from './a11yAudit';

// Every guest and owner page, light and dark, checked for control names, target size and text
// contrast. Run: npx expo export -p web && npx playwright test e2e/a11y.spec.ts
const GUEST = [
  '/',
  '/mamas-kitchen/t/12',
  '/bean-there/t/4',
  '/auntie-akos/t/7',
  '/mamas-kitchen/menu',
  '/mamas-kitchen/menu/itm_mamas0',
  '/mamas-kitchen/order',
  '/mamas-kitchen/wifi',
  '/mamas-kitchen/waiter',
  '/mamas-kitchen/loyalty',
  '/mamas-kitchen/review',
  '/mamas-kitchen/play',
  '/mamas-kitchen/offers',
  '/mamas-kitchen/about',
  '/mamas-kitchen/feedback',
  '/mamas-kitchen/reserve',
  '/mamas-kitchen/events',
  '/mamas-kitchen/notifications',
  '/owner/login',
];

const OWNER = [
  '/owner',
  '/owner/notifications',
  '/owner/orders',
  '/owner/floor',
  '/owner/calls',
  '/owner/menu',
  '/owner/categories',
  '/owner/links',
  '/owner/notice',
  '/owner/promos',
  '/owner/sales',
  '/owner/insights',
  '/owner/customers',
  '/owner/loyalty',
  '/owner/scan',
  '/owner/reviews',
  '/owner/feedback',
  '/owner/business',
  '/owner/branding',
  '/owner/services',
  '/owner/ordering',
  '/owner/socials',
  '/owner/integrations',
  '/owner/integrations/paystack',
  '/owner/integrations/bank',
  '/owner/integrations/chowdeck',
  '/owner/payments',
  '/owner/staff',
  '/owner/devices',
  '/owner/tables',
  '/owner/billing',
  '/owner/settings',
  '/owner/profile',
  '/owner/help',
];

async function settle(page: Page) {
  await page.waitForTimeout(400);
  await expect(page.getByRole('progressbar', { name: 'Loading', exact: true })).toHaveCount(0, {
    timeout: 10_000,
  });
  await page.waitForTimeout(400);
}

function report(path: string, findings: Finding[]) {
  return findings.map((f) => `${path} · ${f.rule} · ${f.what} · ${f.detail}`);
}

for (const scheme of ['light', 'dark'] as const) {
  test(`guest pages pass the a11y check (${scheme})`, async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      colorScheme: scheme,
    });
    const page = await context.newPage();
    const problems: string[] = [];
    for (const path of GUEST) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await settle(page);
      problems.push(...report(path, await audit(page, 24)));
    }
    await context.close();
    expect(problems).toEqual([]);
  });

  test(`owner pages pass the a11y check (${scheme})`, async ({ browser }) => {
    test.setTimeout(180_000);
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme: scheme,
    });
    const page = await context.newPage();
    await page.goto('/owner/login', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Send code', exact: true }).click();
    await page.getByRole('textbox', { name: 'Code', exact: true }).fill('123456');
    await page.getByRole('button', { name: 'Enter', exact: true }).click();
    await settle(page);
    const problems: string[] = [];
    for (const path of OWNER) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await settle(page);
      problems.push(...report(path, await audit(page, 24)));
    }
    await context.close();
    expect(problems).toEqual([]);
  });
}
