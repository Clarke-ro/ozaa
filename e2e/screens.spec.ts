import { expect, test } from '@playwright/test';

const shots = [
  ['/', 'landing'],
  ['/dev/ui', 'gallery'],
  ['/mamas-kitchen/t/12', 'home-mamas'],
  ['/bean-there/t/4', 'home-bean'],
  ['/auntie-akos/t/7', 'home-akos'],
  ['/mamas-kitchen/menu', 'menu'],
  ['/mamas-kitchen/wifi', 'wifi'],
  ['/mamas-kitchen/waiter', 'waiter'],
  ['/mamas-kitchen/loyalty', 'loyalty'],
  ['/mamas-kitchen/review', 'review'],
  ['/mamas-kitchen/play', 'game'],
  ['/owner/login', 'owner-login'],
] as const;

test('landing tells the guest to scan', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Scan the code on your table')).toBeVisible();
});

for (const [path, name] of shots) {
  test(`screenshot ${name}`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `test-results/${name}.png`, fullPage: false });
  });
}
