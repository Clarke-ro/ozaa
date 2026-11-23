/**
 * Tests that also run against the real server (playwright.server.config.ts), not only the mock.
 * Tag a test with it once it passes there: `test('title', SERVER, async ({ page }) => …)`.
 */
export const SERVER = { tag: '@server' };
