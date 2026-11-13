#!/usr/bin/env bash
# Vercel's "Ignored Build Step" for the cravins-app project (see vercel.json, ignoreCommand).
# Exit 0 = skip this build. Exit 1 = build. Never anything else: Vercel treats any other exit
# code as a failed deployment.
#
# Why: one repo feeds two Vercel projects (this app and landing/), and every build counts
# toward Vercel's daily deploy limit. A change to only the landing page, docs or the server
# shouldn't rebuild the app.

# A manual redeploy of the commit already live: always build.
if [ "$VERCEL_GIT_PREVIOUS_SHA" = "$VERCEL_GIT_COMMIT_SHA" ]; then exit 1; fi

base="$(bash "$(dirname "$0")/vercel-base.sh")"
if [ -z "$base" ]; then echo "No earlier commit to compare with: building."; exit 1; fi

# Files that never reach the app's web build.
git diff --quiet "$base" HEAD -- . \
  ':!landing' ':!docs' ':!server' ':!e2e' ':!.github' ':!agent-skills' ':!templates' ':!*.md' \
  || exit 1

# The owner's billing page imports the landing page's prices, so they change the app too.
git diff --quiet "$base" HEAD -- landing/src/content/pricing.ts || exit 1

echo "Only landing/, docs or server files changed since $base: skipping the app build."
exit 0
