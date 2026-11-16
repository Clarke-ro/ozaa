import { expect, test } from '@playwright/test';

// The venue picks list or grid, and there's no diet filter on the guest menu (Clarke, 2026-11-16).
test('the menu bar has section tabs and search only', async ({ page }) => {
  await page.goto('/mamas-kitchen/menu', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('tab', { name: 'All categories', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Search the menu', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Dietary filters|Show as/ })).toHaveCount(0);
});

test('special offers show while an offer runs, and their dish can be added', async ({ page }) => {
  await page.goto('/mamas-kitchen/menu', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Special offers' })).toBeVisible();
  await expect(page.getByText('Jollof Tuesday')).toBeVisible();
  await expect(page.getByText('Happy hour drinks')).toBeVisible();
  await page.getByRole('button', { name: 'Add Jollof & chicken to your order' }).first().click();
  await expect(page.getByText('1 View order')).toBeVisible();
  // A section on its own is about finding one thing: no offers row there.
  await page.getByRole('tab', { name: 'Drinks' }).click();
  await expect(page.getByRole('heading', { name: 'Special offers' })).toHaveCount(0);
});

test('no offers, no section', async ({ page }) => {
  await page.goto('/auntie-akos/menu', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('tab', { name: 'All categories', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Special offers' })).toHaveCount(0);
});

test('search finds a dish, the card adds it, and the dish page adds more', async ({ page }) => {
  await page.goto('/mamas-kitchen/menu', { waitUntil: 'domcontentloaded' });
  // Search is an icon in the menu bar; it opens the search field.
  await page.getByRole('button', { name: 'Search the menu', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search the menu', exact: true }).fill('waakye');
  await expect(page.getByText('1 result')).toBeVisible();
  await page.getByRole('button', { name: 'Add Waakye special to your order' }).click();
  await expect(page.getByText('1 View order')).toBeVisible();

  await page.getByRole('button', { name: 'Waakye special', exact: true }).click();
  await page.getByRole('button', { name: 'One more' }).click();
  await expect(page.getByRole('button', { name: /Add to order · GH₵90/ })).toBeVisible();
  await page.getByRole('button', { name: /Add to order/ }).click();
  await expect(page.getByText('3 View order')).toBeVisible();
});
