import { expect, test } from '@playwright/test';

test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

test('the banner photo shows and share and language respond', async ({ page }) => {
  await page.goto('/mamas-kitchen/t/12', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText("Mama's Kitchen")).toBeVisible();

  const banner = page.getByRole('img', { name: "Mama's Kitchen" }).first();
  await expect(banner).toBeVisible();
  const box = await banner.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThan(120);
  expect(box?.y ?? 99).toBeLessThan(5);

  await page.getByRole('button', { name: 'Share' }).click();
  await expect(page.getByText('Link copied')).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain('/mamas-kitchen/t/12');

  await page.getByRole('button', { name: 'Language' }).click();
  await expect(page.getByText('Twi')).toBeVisible();
  await expect(page.getByText('Hausa')).toBeVisible();
  await expect(page.getByText('Coming soon').first()).toBeVisible();
  await page.getByRole('button', { name: 'Twi' }).click();
  await expect(page.getByRole('button', { name: 'Language' })).toBeVisible();
  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.getByText('Twi')).toBeHidden();
});
