import { expect, test } from '@playwright/test';

// "Add to home screen": the page links a manifest with a name and the two icon sizes phones ask for.
test('the web app links a manifest with the Cravins name and icons', async ({ page, request }) => {
  await page.goto('/mamas-kitchen');
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/manifest.json');
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);

  const manifest = await (await request.get('/manifest.json')).json();
  expect(manifest.name).toBe('Cravins');
  expect(manifest.icons.map((icon: { sizes: string }) => icon.sizes)).toEqual([
    '192x192',
    '512x512',
  ]);
  for (const icon of manifest.icons as { src: string }[]) {
    const res = await request.get(icon.src);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('image/png');
  }
});
