#!/usr/bin/env bash
# The web app built for the real-server browser tests (playwright.server.config.ts): a release
# build that calls the server on this machine, plus the sample photos, as Vercel's build copies.
set -euo pipefail
EXPO_PUBLIC_API_MODE=http \
EXPO_PUBLIC_API_URL=http://127.0.0.1:4000/v1 \
EXPO_PUBLIC_SITE_URL=http://127.0.0.1:4174 \
EXPO_PUBLIC_ALLOW_LOCAL_API=1 \
  npx expo export -p web --output-dir dist-server
mkdir -p dist-server/sample
cp -R assets/sample/. dist-server/sample/
