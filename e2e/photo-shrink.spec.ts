import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

// Owners upload phone photos (about 4000 px). The app shrinks them before upload, so guests get a
// few hundred KB per dish instead of the full photo, and a photo over 5 MB is no longer refused.
test('a big phone photo is shrunk to 1600 px before it is uploaded', async ({ page }) => {
  // Make a 4032×3024 photo of random pixels (the hardest case to compress), as a big JPEG.
  await page.goto('/owner/login');
  const base64 = await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 4032;
    canvas.height = 3024;
    const context = canvas.getContext('2d')!;
    const image = context.createImageData(4032, 3024);
    for (let i = 0; i < image.data.length; i += 1)
      image.data[i] = i % 4 === 3 ? 255 : Math.floor(Math.random() * 256);
    context.putImageData(image, 0, 0);
    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.98),
    );
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
      reader.readAsDataURL(blob);
    });
  });
  const bytes = Buffer.from(base64, 'base64');
  const file = join(tmpdir(), 'cravins-phone-photo.jpg');
  writeFileSync(file, bytes);
  expect(bytes.length).toBeGreaterThan(5 * 1024 * 1024);

  await page.getByRole('textbox', { name: 'Phone number' }).fill('024 000 0001');
  await page.getByRole('button', { name: 'Send code', exact: true }).click();
  await page.getByRole('textbox', { name: 'Code', exact: true }).fill('123456');
  await page.getByRole('button', { name: 'Enter', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Today', exact: true })).toBeVisible({
    timeout: 15_000,
  });
  await page.evaluate(() => {
    history.pushState({}, '', '/owner/menu');
    dispatchEvent(new PopStateEvent('popstate'));
  });
  // Record the file the app hands to the upload.
  await page.evaluate(() => {
    const original = URL.createObjectURL;
    (window as unknown as { made: { size: number; type: string }[] }).made = [];
    URL.createObjectURL = (f: Blob | MediaSource) => {
      if (f instanceof Blob)
        (window as unknown as { made: { size: number; type: string }[] }).made.push({
          size: f.size,
          type: f.type,
        });
      return original(f);
    };
  });
  await page
    .getByRole('button', { name: /add dish|new dish|add item/i })
    .first()
    .click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Choose photo' }).first().click();
  await (await chooser).setFiles(file);

  await expect
    .poll(() => page.evaluate(() => (window as unknown as { made: unknown[] }).made.length), {
      timeout: 15_000,
    })
    .toBe(1);
  const [made] = await page.evaluate(
    () => (window as unknown as { made: { size: number; type: string }[] }).made,
  );
  expect(made!.type).toBe('image/jpeg');
  expect(made!.size).toBeLessThan(5 * 1024 * 1024);
  const preview = page.locator('img[src^="blob:"]').first();
  await expect(preview).toBeVisible();
  const width = await preview.evaluate((img: HTMLImageElement) =>
    Math.max(img.naturalWidth, img.naturalHeight),
  );
  expect(width).toBe(1600);
  await expect(page.getByText(/over 5 MB/)).toHaveCount(0);
});
