import { expect, test } from '@playwright/test';

test('dietary filters open in a sheet and can clear back to the menu', async ({ page }) => {
  await page.goto('/mamas-kitchen/menu', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('tab', { name: 'All', exact: true })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Mains' })).toBeVisible();
  await expect(page.getByText('Show only')).toHaveCount(0);
  await expect(page.getByText('Jollof & chicken')).toBeVisible();

  await page.getByRole('button', { name: 'Dietary filters' }).click();
  await expect(page.getByRole('checkbox', { name: 'Vegetarian' })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Gluten free' })).toBeVisible();
  await page.getByRole('checkbox', { name: 'Halal' }).click();
  await page.getByRole('button', { name: 'Close' }).click({ position: { x: 20, y: 20 } });
  await expect(page.getByText('Jollof & chicken')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Dietary filters' })).toBeVisible();

  await page.getByRole('button', { name: 'Dietary filters' }).click();
  // No sample dish is both halal and vegan.
  await page.getByRole('checkbox', { name: 'Halal' }).click();
  await page.getByRole('checkbox', { name: 'Vegan' }).click();
  await page.getByRole('button', { name: 'Apply' }).click();

  await expect(page.getByRole('button', { name: 'Dietary filters, 2 on' })).toBeVisible();
  await expect(page.getByText('Nothing matches those filters.')).toBeVisible();
  await expect(page.getByText('Jollof & chicken')).toBeHidden();
  await expect(page.getByRole('tab', { name: 'All', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Dietary filters, 2 on' }).click();
  await page.getByRole('button', { name: 'Clear' }).click();
  await expect(page.getByText('Jollof & chicken')).toBeVisible();
  await expect(page.getByText('Nothing matches those filters.')).toHaveCount(0);
});

test('search finds a dish, the card adds it, and the dish page adds more', async ({ page }) => {
  await page.goto('/mamas-kitchen/menu', { waitUntil: 'domcontentloaded' });
  // The search box is always on screen in the menu's control bar.
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
