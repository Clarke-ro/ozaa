import { expect, type Page } from '@playwright/test';

/** True when this run uses the real server (playwright.server.config.ts), not the mock. */
export const REAL_SERVER = process.env.E2E_REAL_SERVER === '1';

/**
 * The demo staff (src/mocks/demo.ts). The mock signs them in by phone with the code 123456. On the
 * real server they are seeded by server/src/db/seedE2eStaff.ts and sign in with a Clerk test
 * email, which Clerk's development instance accepts with the code 424242 and never emails.
 */
const STAFF = {
  Ama: '024 000 0001',
  Kwesi: '024 000 0002',
  Yaw: '024 000 0003',
  Kojo: '024 000 0004',
  Akosua: '024 000 0005',
} as const;
export type DemoStaff = keyof typeof STAFF;

/** Signs in on the owner login page and waits for Today (a tab on phones, the sidebar when wide). */
export async function signIn(page: Page, who: DemoStaff = 'Ama', options: { wide?: boolean } = {}) {
  await page.goto('/owner/login', { waitUntil: 'domcontentloaded' });
  if (REAL_SERVER) {
    await page
      .getByRole('textbox', { name: 'Email', exact: true })
      .fill(`${who.toLowerCase()}+clerk_test@example.com`);
  } else {
    await page.getByRole('textbox', { name: 'Phone number', exact: true }).fill(STAFF[who]);
  }
  await page.getByRole('button', { name: 'Send code', exact: true }).click();
  const code = page.getByRole('textbox', { name: 'Code', exact: true });
  await expect(code).toBeVisible({ timeout: 30_000 });
  await code.fill(REAL_SERVER ? '424242' : '123456');
  await page.getByRole('button', { name: 'Enter', exact: true }).click();
  await expect(
    page.getByRole(options.wide ? 'button' : 'tab', { name: 'Today', exact: true }),
  ).toBeVisible({ timeout: 30_000 });
}
