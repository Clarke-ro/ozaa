import { expect, test } from '@playwright/test';

test('dietary filters open in a sheet and can clear back to the menu', async ({ page }) => {
  await page.goto('/mamas-kitchen/menu', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Food')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mains' })).toBeVisible();
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
  await page.getByRole('checkbox', { name: 'Vegetarian' }).click();
  await page.getByRole('checkbox', { name: 'Vegan' }).click();
  await page.getByRole('button', { name: 'Apply' }).click();

  await expect(page.getByRole('button', { name: 'Dietary filters, 2 on' })).toBeVisible();
  await expect(page.getByText('Nothing matches those filters.')).toBeVisible();
  await expect(page.getByText('Jollof & chicken')).toBeHidden();
  await expect(page.getByText('Food')).toBeVisible();

  await page.getByRole('button', { name: 'Dietary filters, 2 on' }).click();
  await page.getByRole('button', { name: 'Clear' }).click();
  await expect(page.getByText('Jollof & chicken')).toBeVisible();
  await expect(page.getByText('Nothing matches those filters.')).toHaveCount(0);
});
