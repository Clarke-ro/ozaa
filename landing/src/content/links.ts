/**
 * Where "Get Cravins" goes: the Cravins web app (the Expo app's web build). Set PUBLIC_APP_URL when
 * building the site, e.g. PUBLIC_APP_URL=https://app.example.com npm run build. Until the app
 * is hosted it points at the local Expo web server.
 */
export const LOCAL_APP_URL = "http://localhost:8081";

export function appLinks(base: string | undefined) {
  const root = (base?.trim() || LOCAL_APP_URL).replace(/\/+$/, "");
  return {
    /** The app's start page: try a sample table or sign in. */
    app: `${root}/`,
    /** A sample restaurant's table, so a visitor sees the guest side straight away. */
    sample: `${root}/mamas-kitchen/t/12`,
    owner: `${root}/owner/login`,
  } as const;
}

// import.meta.env only exists in the Astro build; plain Node (the tests) falls back to local.
export const links = appLinks(
  (import.meta as { env?: Record<string, string | undefined> }).env?.PUBLIC_APP_URL,
);
