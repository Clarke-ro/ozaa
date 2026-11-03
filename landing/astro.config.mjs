import { defineConfig } from "astro/config";

export default defineConfig({
  // The public address, for the sitemap, RSS feed and share links. Set SITE_URL when the
  // domain exists; until then links in those files point at the local preview.
  site: process.env.SITE_URL || "http://localhost:4321",
  // Pages open through the client router, so links are fetched ahead when hovered or seen.
  prefetch: { prefetchAll: true, defaultStrategy: "hover" },
  compressHTML: true,
  build: {
    inlineStylesheets: "always",
  },
  vite: {
    // Use this folder's tsconfig only. Otherwise Vite can climb to the repo root and read
    // the Expo app's tsconfig.json, which extends "expo/tsconfig.base". CI installs only
    // landing/, so that package is missing there and the build fails.
    tsconfig: "./tsconfig.json",
  },
});
