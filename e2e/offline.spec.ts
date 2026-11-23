import { expect, test, type Page } from '@playwright/test';
import { SERVER } from './tags';

// BUILD.md section 11 on a phone that drops its connection: the menu says it's showing saved
// data, the basket says it can't send, a failed send keeps the basket, and reconnecting sends it.
// Screens behind the current one stay mounted, so only text the guest can see counts.
const seen = (page: Page, text: string | RegExp) => page.getByText(text).filter({ visible: true });

test(
  'a guest who loses signal keeps their basket and sends it once back online',
  SERVER,
  async ({ page, context }) => {
    // Auntie Akos takes payment in person, so the order goes straight to the kitchen.
    await page.goto('/auntie-akos/t/7', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Call waiter').first()).toBeVisible({ timeout: 15_000 });

    // Move inside the app: a full page load restarts the in-browser mock and forgets the table.
    await page.getByRole('button', { name: /^Menu/ }).first().click();
    const add = page.getByRole('button', { name: /^Add .+ to your order$/ }).first();
    await expect(add).toBeVisible({ timeout: 15_000 });

    await context.setOffline(true);
    await expect(seen(page, /You're offline\. Showing what we saved/)).toBeVisible();
    await context.setOffline(false);
    await expect(seen(page, /You're offline/)).toHaveCount(0);

    await add.click();
    await page.getByRole('button', { name: /View order/ }).click();
    const send = page.getByRole('button', { name: 'Send to kitchen' });
    await expect(send).toBeVisible();

    await context.setOffline(true);
    await expect(seen(page, "You're offline. Connect to send.")).toBeVisible();
    await send.click();
    await expect(seen(page, "You're offline. Connect and try again.")).toBeVisible();
    // Still on the basket, with the dish in it.
    await expect(send).toBeVisible();

    await context.setOffline(false);
    await send.click();
    await expect(page.getByText(/^Order #/).first()).toBeVisible({ timeout: 15_000 });
  },
);
