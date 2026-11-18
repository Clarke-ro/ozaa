import { expect, test, type Page } from '@playwright/test';

// BUILD.md 4c.9: walk the redesigned owner app end to end on the mock, the way an owner would.
// Pages are opened from the sidebar (not by URL) so the in-browser mock keeps its state.

test.use({ viewport: { width: 1440, height: 900 } });

async function signIn(page: Page, phone?: string) {
  await page.goto('/owner/login', { waitUntil: 'domcontentloaded' });
  if (phone) await page.getByRole('textbox', { name: 'Phone number', exact: true }).fill(phone);
  await page.getByRole('button', { name: 'Send code', exact: true }).click();
  await page.getByRole('textbox', { name: 'Code', exact: true }).fill('123456');
  await page.getByRole('button', { name: 'Enter', exact: true }).click();
}

const nav = (page: Page, name: string) =>
  page.getByRole('button', { name, exact: true }).first().click();

// The number shown after a sidebar item's name ("Calls 1"); none shown means 0.
async function badge(page: Page, name: string): Promise<number> {
  const text = await page.getByRole('button', { name, exact: true }).first().innerText();
  const match = /(\d+)\s*$/.exec(text.trim());
  return match ? Number.parseInt(match[1] ?? '0', 10) : 0;
}

test('answering a call moves Calls, Floor, Today and the badge together', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await signIn(page);
  await expect(page.getByRole('button', { name: 'Today', exact: true })).toBeVisible();
  await expect(page.getByText('Table 4 needs a waiter')).toBeVisible();
  await expect.poll(() => badge(page, 'Calls')).toBeGreaterThan(0);
  const callsBefore = await badge(page, 'Calls');

  await nav(page, 'Calls');
  await page
    .getByRole('link', { name: /Table 4.*Open the call/ })
    .first()
    .click();
  await page.getByRole('button', { name: 'Coming now', exact: true }).click();
  // Back on the board, the call has left Waiting and the count dropped by one.
  await expect.poll(() => badge(page, 'Calls')).toBe(callsBefore - 1);

  await nav(page, 'Floor');
  await expect(page.getByText('Needs a waiter')).toHaveCount(0);
  await nav(page, 'Today');
  await expect(page.getByText('Table 4 needs a waiter')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('accepting a new order lowers the Orders badge, then Start cooking shows', async ({ page }) => {
  await signIn(page);
  await expect(page.getByRole('button', { name: 'Today', exact: true })).toBeVisible();
  // The badge appears once the orders have loaded.
  await expect.poll(() => badge(page, 'Orders')).toBeGreaterThan(0);
  const before = await badge(page, 'Orders');
  await nav(page, 'Orders');
  await page.getByRole('button', { name: 'Accept order', exact: true }).first().click();
  // The sample kitchen moves other tickets on its own over time, so only "fewer" is certain.
  await expect.poll(() => badge(page, 'Orders')).toBeLessThan(before);
  // An accepted ticket stays under New, with Start cooking as its next step.
  await expect(page.getByRole('button', { name: 'Start cooking', exact: true }).first()).toBeVisible();
  // Opening one ticket loads that order on its own page, not the whole list.
  await page.getByRole('button', { name: /, #\d+/ }).first().click();
  await expect(page).toHaveURL(/\/owner\/orders\/ord_/);
  await expect(page.getByRole('heading', { level: 1, name: /#\d+/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mark paid', exact: true })).toBeVisible();
});

test('switching location changes the whole dashboard', async ({ page }) => {
  await signIn(page);
  await expect(page.getByText("Here's how Mama's Kitchen is doing today")).toBeVisible();
  await page.getByRole('button', { name: /^Location: / }).click();
  await page.getByRole('radio', { name: /Bean There Cafe/ }).click();
  await expect(page.getByText(/Here's how Bean There/)).toBeVisible();
  // Mama's sample call is not Bean There's.
  await expect(page.getByText('Table 4 needs a waiter')).toHaveCount(0);
});

test('a stamp shows on the customer, in Customers and in the scan log', async ({ page }) => {
  await signIn(page);
  await nav(page, 'Scan and stamp');
  await page.getByRole('textbox', { name: 'Name, last 4 digits or card code' }).fill('Esi');
  await page.getByRole('button', { name: 'Add a stamp', exact: true }).first().click();
  await expect(page.getByText(/Esi/).last()).toBeVisible();
  await expect(page.getByText(/Stamp · \d+ on the card/)).toBeVisible();
  await nav(page, 'Customers');
  await expect(page.getByRole('button', { name: 'Esi', exact: true })).toBeVisible();
});

test('a waiter sees only the floor jobs, and Sales is closed to them', async ({ page }) => {
  await signIn(page, '0240000002');
  await expect(page.getByRole('button', { name: 'Floor', exact: true }).first()).toBeVisible();
  for (const hidden of [
    'Sales',
    'Business and locations',
    'Billing',
    'Integrations',
    'Promos and coupons',
  ]) {
    await expect(page.getByRole('button', { name: hidden, exact: true })).toHaveCount(0);
  }
});

test('a venue with no history shows honest empty states, not sample numbers', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await signIn(page, '0240000005');
  await expect(page.getByRole('button', { name: 'Today', exact: true })).toBeVisible();
  await nav(page, 'Promos and coupons');
  await expect(page.getByText('No promos yet')).toBeVisible();
  await nav(page, 'Insights');
  await expect(page.getByText('Sample', { exact: true })).toHaveCount(0);
  await nav(page, 'Sales');
  await expect(page.getByText('No earlier period to compare with.')).toBeVisible();
  expect(errors).toEqual([]);
});
