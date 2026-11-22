import { expect, test, type Page } from '@playwright/test';

// On the web, buttons, switches and the notice banner animate without Reanimated (which kept
// ~100 KB off every guest page). These check the motion still happens.

async function signIn(page: Page) {
  await page.goto('/owner/login', { waitUntil: 'domcontentloaded' });
  await page.getByRole('textbox', { name: 'Phone number' }).fill('024 000 0001');
  await page.getByRole('button', { name: 'Send code', exact: true }).click();
  await page.getByRole('textbox', { name: 'Code', exact: true }).fill('123456');
  await page.getByRole('button', { name: 'Enter', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Today', exact: true })).toBeVisible({
    timeout: 15_000,
  });
}
const go = (page: Page, path: string) =>
  page.evaluate((to) => {
    history.pushState({}, '', to);
    dispatchEvent(new PopStateEvent('popstate'));
  }, path);

test('a button shrinks under the finger and settles back', async ({ page }) => {
  await page.goto('/owner/login', { waitUntil: 'domcontentloaded' });
  await page.getByRole('textbox', { name: 'Phone number' }).fill('024 000 0001');
  const button = await page.getByRole('button', { name: 'Send code', exact: true }).elementHandle();
  const box = (await button!.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect
    .poll(() => button!.evaluate((el) => getComputedStyle(el).transform))
    .toBe('matrix(0.97, 0, 0, 0.97, 0, 0)');
  await page.mouse.up();
  await expect
    .poll(() => button!.evaluate((el) => getComputedStyle(el).transform))
    .toBe('matrix(1, 0, 0, 1, 0, 0)');
});

test('a switch slides its knob when tapped', async ({ page }) => {
  await signIn(page);
  await go(page, '/owner/settings');
  const toggle = page.getByRole('switch').first();
  await expect(toggle).toBeVisible();
  const knob = toggle.locator('div div').first();
  const before = await knob.evaluate((el) => getComputedStyle(el).transform);
  await toggle.click();
  await expect.poll(() => knob.evaluate((el) => getComputedStyle(el).transform)).not.toBe(before);
});

test("a long store notice scrolls across the guest's home page", async ({ page }) => {
  await signIn(page);
  await go(page, '/owner/notice');
  await page
    .getByPlaceholder('Kitchen closes at 9 tonight')
    .fill(
      'Kitchen closes at 9 tonight. Live band from 8 on Friday, and jollof is half price before 6 every weekday!',
    );
  await page.getByRole('switch', { name: 'Show the banner' }).click();
  await page.getByRole('button', { name: 'Save notice' }).click();
  // Only once it has saved, or the guest page could load the venue before the notice exists.
  await expect(page.getByText('Saved', { exact: true })).toBeVisible();
  await go(page, '/mamas-kitchen/t/12');
  // The owner's notice page shows a preview with the same text: wait until it has gone.
  await expect(page.getByPlaceholder('Kitchen closes at 9 tonight')).toHaveCount(0);
  // The one-line text sits in a measuring box inside the moving row; read the row's offset fresh
  // each time, since the banner can draw again while the page settles.
  const offset = () =>
    page.evaluate(() => {
      const text = [...document.querySelectorAll('div')].find(
        (d) =>
          d.children.length === 0 &&
          (d.textContent ?? '').startsWith('Kitchen closes at 9 tonight. Live band'),
      );
      const row = text?.parentElement?.parentElement;
      return row ? new DOMMatrix(getComputedStyle(row).transform).m41 : null;
    });
  await expect.poll(offset, { timeout: 15_000 }).not.toBeNull();
  const first = (await offset())!;
  // It moves (left, or back to the right edge at the end of a lap).
  await expect.poll(async () => Math.abs((await offset())! - first)).toBeGreaterThan(10);
});
