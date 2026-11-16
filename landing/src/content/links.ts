/**
 * Where the site's buttons go. Two web builds of the Cravins app sit behind them:
 *
 * - PUBLIC_APP_URL: the real app, on the real server. "Log in" and "Get started" open its owner
 *   sign-in.
 * - PUBLIC_DEMO_URL: the demo build, with sample restaurants and made-up data. "Try it", the
 *   sample menus and the QR card open it, so visitors never place orders at the real venues.
 *
 * Without PUBLIC_DEMO_URL the samples use PUBLIC_APP_URL, as before the split. Without either,
 * both point at the local Expo web server.
 */
export const LOCAL_APP_URL = "http://localhost:8081";

const clean = (base: string | undefined) => base?.trim().replace(/\/+$/, "") || "";

export function appLinks(appBase: string | undefined, demoBase?: string) {
  const app = clean(appBase) || LOCAL_APP_URL;
  const demo = clean(demoBase) || app;
  return {
    /** The real app's start page. */
    app: `${app}/`,
    /** Owner and staff sign-in on the real app. */
    owner: `${app}/owner/login`,
    /** The demo's start page; sample menus live under it. */
    demo: `${demo}/`,
    /** A sample restaurant's table in the demo, so a visitor sees the guest side straight away. */
    sample: `${demo}/mamas-kitchen/t/12`,
  } as const;
}

// import.meta.env only exists in the Astro build; plain Node (the tests) falls back to local.
const env = (import.meta as { env?: Record<string, string | undefined> }).env;
export const links = appLinks(env?.PUBLIC_APP_URL, env?.PUBLIC_DEMO_URL);
