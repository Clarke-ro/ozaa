/**
 * Tests that also run against the real server (playwright.server.config.ts), not only the mock.
 * Tag a test with it once it passes there: `test('title', SERVER, async ({ page }) => …)`.
 */
export const SERVER = { tag: '@server' };

/**
 * Where Place order goes for MoMo or card: the mock's stand-in page, or Paystack's own test
 * checkout when the real server starts the payment.
 */
export const PAYMENT_PAGE = /\/dev\/mock-checkout|^https:\/\/checkout\.paystack\.com\//;
