import { defineConfig } from "astro/config";

export default defineConfig({
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
