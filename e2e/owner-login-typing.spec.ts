import { devices, expect, test } from '@playwright/test';

// A person taps the sign-in box and types, key by key. fill() skips the tap, which hid a bug: on
// the web the tap reached the "close the keyboard" area around the form, and the box lost focus
// at once, so nothing could be typed. The real build (email) and the demo (phone) share the box.
for (const [name, options] of [
  ['desktop', { viewport: { width: 1280, height: 800 } }],
  ['phone', { ...devices['iPhone 13'], defaultBrowserType: undefined }],
] as const) {
  test(`the sign-in box keeps focus and takes typing (${name})`, async ({ browser }) => {
    const context = await browser.newContext(options);
    const page = await context.newPage();
    await page.goto('/owner/login', { waitUntil: 'domcontentloaded' });
    const box = page.getByRole('textbox', { name: 'Phone number' });
    await expect(box).toBeVisible({ timeout: 15_000 });
    await box.fill('');
    if (name === 'phone') await box.tap();
    else await box.click();
    await expect(box).toBeFocused();
    await page.keyboard.type('0240000004');
    await expect(box).toHaveValue('0240000004');
    await page.getByRole('button', { name: 'Send code', exact: true }).click();

    const code = page.getByRole('textbox', { name: 'Code', exact: true });
    await expect(code).toBeVisible();
    if (name === 'phone') await code.tap();
    else await code.click();
    await page.keyboard.type('123456');
    await expect(code).toHaveValue('123456');
    await context.close();
  });
}
