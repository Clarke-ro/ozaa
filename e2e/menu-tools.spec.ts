import { expect, test, type Page } from '@playwright/test';
import { signIn } from './signIn';

// BUILD.md 5b.3: the menu's add-on groups, Change prices, and "sold out for a while", on the mock.
// Set SHOTS_DIR to also save screenshots for design review.
const shots = process.env.SHOTS_DIR;

async function shot(page: Page, name: string) {
  if (!shots) return;
  await page.waitForTimeout(400);
  const project = test.info().project.name;
  await page.screenshot({ path: `${shots}/${project ? `${project}-` : ''}${name}.png` });
}

async function openMenuAction(page: Page, action: string) {
  await page.getByRole('button', { name: 'More menu actions', exact: true }).click();
  await page.getByRole('menuitem', { name: action, exact: true }).click();
}

test.beforeEach(async ({ page }) => {
  // Wide screens show the sidebar, where Today is a button, not a tab.
  await signIn(page, 'Ama', { wide: (page.viewportSize()?.width ?? 0) >= 1024 });
  await page.goto('/owner/menu', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'More menu actions', exact: true })).toBeVisible({
    timeout: 30_000,
  });
});

test('add-on groups: add a shared group, then pick it on a dish', async ({ page }) => {
  await openMenuAction(page, 'Add-on groups');
  await expect(page.getByText('No groups yet. Add one, then pick it on each dish.')).toBeVisible();
  await shot(page, 'library-empty');

  await page.getByRole('button', { name: 'New group', exact: true }).click();
  await page.getByRole('textbox', { name: 'Group name', exact: true }).fill('Spice level');
  await page.getByRole('textbox', { name: 'Option', exact: true }).first().fill('Mild');
  await shot(page, 'library-edit');
  await page.getByRole('button', { name: 'Save group', exact: true }).click();
  await expect(page.getByText('Spice level', { exact: true })).toBeVisible();
  await expect(page.getByText('1 option · on 0 dishes')).toBeVisible();
  await shot(page, 'library-list');
  await page.keyboard.press('Escape');

  // The dish page offers the shared group.
  await page
    .getByRole('button', { name: /^Edit / })
    .first()
    .click();
  await expect(page.getByText('Shared add-ons', { exact: true })).toBeVisible({ timeout: 15_000 });
  await page.getByText('Spice level', { exact: true }).click();
  await shot(page, 'dish-shared');
  await page.getByRole('button', { name: 'Save dish', exact: true }).click();
  await expect(page.getByRole('button', { name: 'More menu actions', exact: true })).toBeVisible();
});

test('change prices: every listed dish goes up by the percent', async ({ page }) => {
  await openMenuAction(page, 'Change prices');
  await page.getByRole('textbox', { name: 'Change by (%)', exact: true }).fill('10');
  await expect(page.getByText(/ becomes /)).toBeVisible();
  await shot(page, 'prices');
  await page.getByRole('button', { name: /^Change \d+ prices?$/ }).click();
  await expect(page.getByText('Prices changed', { exact: true })).toBeVisible();
});

test('sold out for a while: the dish says when it is back', async ({ page }) => {
  await page
    .getByRole('button', { name: /^Edit / })
    .first()
    .click();
  await page.getByText('Out of stock', { exact: true }).click();
  await page.getByText('2 hours', { exact: true }).click();
  await shot(page, 'dish-snooze');
  await page.getByRole('button', { name: 'Save dish', exact: true }).click();
  await expect(page.getByText(/^Back \d\d:\d\d$/).first()).toBeVisible({ timeout: 15_000 });
  await shot(page, 'menu-back-at');
});
