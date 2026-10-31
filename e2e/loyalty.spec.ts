import { expect, test } from '@playwright/test';

test('guest loyalty wallet card, earn history, claim code QR, and owner confirmation', async ({
  page,
}) => {
  await page.goto('/mamas-kitchen/loyalty', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Loyalty card').first()).toBeVisible();
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'test-results/loyalty-join.png', fullPage: false });

  await page.getByRole('button', { name: 'Open sample card (Ama)' }).click();
  await expect(page.getByText('Ama · Since 2026-03-14')).toBeVisible();
  await expect(page.getByText('Your reward is ready.')).toBeVisible();
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/loyalty-wallet-front.png', fullPage: false });

  await page.getByText('Activity').scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/loyalty-earn-history.png', fullPage: false });

  await page.getByText("Mama's Kitchen").first().scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: 'Get claim code Free chilled sobolo' }).click();
  await expect(page.getByText('Show this code to staff').first()).toBeVisible();
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/loyalty-redeem-claim-qr.png', fullPage: false });

  await page.goto('/bean-there/loyalty', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Open sample card (Ama)' }).click();
  await expect(page.getByText('Free flat white')).toBeVisible();
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/loyalty-wallet-points-bean.png', fullPage: false });

  await page.goto('/auntie-akos/loyalty', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Open sample card (Ama)' }).click();
  await expect(page.getByText('Free fufu & light soup')).toBeVisible();
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/loyalty-wallet-akos.png', fullPage: false });

  await page.goto('/owner/loyalty', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Confirm a guest reward')).toBeVisible();
  await expect(page.getByText('Programme setup')).toBeVisible();
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'test-results/owner-loyalty-setup.png', fullPage: false });

  await page.getByText('Confirmed redemptions', { exact: true }).scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/owner-loyalty-confirm-members.png', fullPage: false });
});
