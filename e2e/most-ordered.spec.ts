import { expect, test, type Page } from '@playwright/test';

// BUILD.md 5b.6b: a "Most ordered" row at the top of the guest menu, from real orders. Mock only:
// the server's sample venues have no sales yet, so the row hides there. Set SHOTS_DIR for shots.
const shots = process.env.SHOTS_DIR;

async function shot(page: Page, name: string) {
  if (!shots) return;
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${shots}/${test.info().project.name}-${name}.png` });
}

test('the guest menu opens with the dishes ordered most, and one can be added', async ({
  page,
}) => {
  await page.goto('/mamas-kitchen/t/12', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /^Menu/ }).first().click({ timeout: 15_000 });
  const heading = page.getByRole('heading', { name: 'Most ordered' });
  await expect(heading).toBeVisible();
  // Above the offers, at the top of the menu.
  const offers = page.getByRole('heading', { name: 'Special offers' });
  expect((await heading.boundingBox())!.y).toBeLessThan((await offers.boundingBox())!.y);
  await shot(page, 'most-ordered');

  await page.getByRole('button', { name: 'Add Sobolo to your order' }).first().click();
  await expect(page.getByText('1 View order')).toBeVisible();

  // Searching hides the row, so only the results show.
  await page.getByRole('button', { name: 'Search the menu', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search the menu', exact: true }).fill('jollof');
  await expect(heading).toHaveCount(0);
});
