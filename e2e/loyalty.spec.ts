import { expect, test } from '@playwright/test';

test('guest loyalty wallet card, earn history, claim code QR, and owner confirmation', async ({
  page,
}) => {
  await page.goto('/mamas-kitchen/loyalty', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Loyalty card').first()).toBeVisible();
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'test-results/loyalty-join.png', fullPage: false });

  // The join form (with the sample card) opens after tapping Join.
  await page.getByRole('button', { name: 'Join the card' }).click();
  await page.getByRole('button', { name: 'Open sample card (Ama)' }).click();
  // Rewards at 4 and 8: with 5 stamps the card counts toward the 8.
  const card = page.getByRole('button', { name: /Mama's Kitchen loyalty card\. 5\/8\./ });
  await expect(card).toBeVisible();
  await expect(page.getByText('Tap your card to get scanned')).toBeVisible();
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/loyalty-wallet-front.png', fullPage: false });

  // Tapping the card turns it over to the big QR, and tapping again turns it back.
  await card.click();
  await expect(page.getByText('Tap to see your stamps')).toBeVisible();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/loyalty-wallet-back.png', fullPage: false });
  await page.getByRole('button', { name: 'Your QR code for staff to scan' }).click();
  await expect(page.getByText('Tap your card to get scanned')).toBeVisible();

  await page.getByText('Activity').scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/loyalty-earn-history.png', fullPage: false });

  await page.getByText("Mama's Kitchen").first().scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: 'Get claim code Free chilled sobolo' }).click();
  await expect(page.getByText('Show this code to staff').first()).toBeVisible();
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/loyalty-redeem-claim-qr.png', fullPage: false });

  await page.goto('/bean-there/loyalty', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Join the card' }).click();
  await page.getByRole('button', { name: 'Open sample card (Ama)' }).click();
  await expect(page.getByText('Free flat white')).toBeVisible();
  // A points card says so.
  await expect(page.getByText('55/80 pts')).toBeVisible();
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/loyalty-wallet-points-bean.png', fullPage: false });

  await page.goto('/auntie-akos/loyalty', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Join the card' }).click();
  await page.getByRole('button', { name: 'Open sample card (Ama)' }).click();
  await expect(page.getByText('Free fufu & light soup')).toBeVisible();
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'test-results/loyalty-wallet-akos.png', fullPage: false });

  // Deleting asks first: Cancel keeps the card, Delete card removes it.
  await page.getByRole('button', { name: 'Delete my card' }).click();
  await expect(page.getByText('Delete your card?')).toBeVisible();
  // Let the dialog finish fading in before the screenshot.
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/loyalty-delete-confirm.png', fullPage: false });
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByText('Delete your card?')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /loyalty card\./ })).toBeVisible();
  await page.getByRole('button', { name: 'Delete my card' }).click();
  await page.getByRole('button', { name: 'Delete card', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Join the card' })).toBeVisible();

  await page.goto('/owner/login', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Send code' }).click();
  await page.getByRole('textbox', { name: 'Code', exact: true }).fill('123456');
  await page.getByRole('button', { name: 'Enter' }).click();
  // Owners have Loyalty as a tab.
  await page.getByRole('tab', { name: 'Loyalty', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Stamp card' })).toBeVisible();
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'test-results/owner-loyalty-setup.png', fullPage: false });

  await page.getByRole('tab', { name: 'Members', exact: true }).click();
  await page.waitForTimeout(800);
  await page.screenshot({
    path: 'test-results/owner-loyalty-confirm-members.png',
    fullPage: false,
  });
});
