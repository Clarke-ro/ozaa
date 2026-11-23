import { expect, test } from '@playwright/test';
import { signIn } from './signIn';
import { SERVER } from './tags';

// Setup: four short steps, Wi-Fi and online payments can be skipped, then a summary that says
// what was set up. Guests can always pay in person, so skipping payments is fine.

test('owner setup: skip Wi-Fi and payments, then see what was set up', SERVER, async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  // Akosua runs Auntie Akos, the sample with no Paystack yet, so the payments step offers to connect.
  await signIn(page, 'Akosua');
  // Setup isn't in the menu any more; the owner reaches it from "Complete your setup" or a link.
  await page.getByRole('tab', { name: 'More', exact: true }).waitFor();
  await page.goto('/owner/setup', { waitUntil: 'domcontentloaded' });

  await expect(page.getByText('What is your venue called?')).toBeVisible({ timeout: 15_000 });
  // Setup stands alone: no tab bar to wander off into.
  await expect(page.getByRole('tab', { name: 'More', exact: true })).toHaveCount(0);
  await page.screenshot({ path: 'test-results/setup-venue.png' });
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('How many tables?')).toBeVisible({ timeout: 15_000 });
  await page.screenshot({ path: 'test-results/setup-tables.png' });
  await page.getByRole('button', { name: 'Next', exact: true }).click();

  await expect(page.getByText('Your guest Wi-Fi')).toBeVisible({ timeout: 15_000 });
  await page.screenshot({ path: 'test-results/setup-wifi.png' });
  await page.getByRole('button', { name: 'Skip', exact: true }).click();

  await expect(page.getByText('How guests pay')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('button', { name: 'Connect Paystack' })).toBeVisible();
  await page.screenshot({ path: 'test-results/setup-payments.png' });
  await page.getByRole('button', { name: 'Skip for now', exact: true }).click();

  await expect(page.getByText("You're ready")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('button', { name: 'Payments, In person only' })).toBeVisible();
  await page.screenshot({ path: 'test-results/setup-done.png' });

  // A summary line goes back to its step.
  await page.getByRole('button', { name: /^Wi-Fi, / }).click();
  await expect(page.getByText('Your guest Wi-Fi')).toBeVisible({ timeout: 15_000 });

  expect(errors).toEqual([]);
});
