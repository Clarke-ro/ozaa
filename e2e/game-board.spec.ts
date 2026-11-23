import { expect, test, type Page } from '@playwright/test';

// The game's board comes from the leaderboard call (the demo mixes in sample players), and a
// name typed after a round is saved on the server with that round's score (BUILD.md 5.6).

async function openGame(page: Page) {
  await page.goto('/mamas-kitchen/t/12');
  await expect(page.getByText("Mama's Kitchen").first()).toBeVisible({ timeout: 15_000 });
  // Inside the app, so the table visit carries over to the game page.
  await page.evaluate(() => {
    history.pushState({}, '', '/mamas-kitchen/play');
    dispatchEvent(new PopStateEvent('popstate'));
  });
}

test('the board shows the venue’s top scores, and a name is saved with the round', async ({ page }) => {
  await openGame(page);
  await expect(page.getByText(/Kwame/)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/sample/).first()).toBeVisible();

  // One quick round: start, then drop twice so a plate misses and the game ends.
  await page.getByRole('button', { name: 'Tap to start' }).click();
  const drop = page.getByRole('button', { name: 'Drop the plate' });
  for (let i = 0; i < 6 && !(await page.getByRole('button', { name: 'Play again' }).isVisible()); i += 1) {
    await drop.click({ force: true });
    await page.waitForTimeout(700);
  }
  await expect(page.getByRole('button', { name: 'Play again' })).toBeVisible();

  await page.getByLabel('Nickname (optional)').fill('Adwoa');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  // The round isn't in the top five against the samples, so the guest sees it was saved.
  await expect(page.getByText('Saved as Adwoa')).toBeVisible();
});
