#!/usr/bin/env bash
# Vercel's "Ignored Build Step" for the cravins-app project (see vercel.json, ignoreCommand).
# Exit 0 = skip this build. Exit 1 = build.
#
# Why: one repo feeds two Vercel projects (this app and landing/), and every build counts
# toward Vercel's daily deploy limit. A change to only the landing page, docs or the server
# shouldn't rebuild the app.

# A manual redeploy of the commit already live: always build.
if [ "$VERCEL_GIT_PREVIOUS_SHA" = "$VERCEL_GIT_COMMIT_SHA" ]; then exit 1; fi

# Compare with the last commit this project deployed. On a first deploy there is none, so use
# the commit before. If that commit isn't in Vercel's shallow clone, git fails and we build.
base="${VERCEL_GIT_PREVIOUS_SHA:-HEAD^}"

# Files that never reach the app's web build.
git diff --quiet "$base" HEAD -- . \
  ':!landing' ':!docs' ':!server' ':!e2e' ':!.github' ':!agent-skills' ':!templates' ':!*.md' \
  || exit 1

# The owner's billing page imports the landing page's prices, so they change the app too.
git diff --quiet "$base" HEAD -- landing/src/content/pricing.ts || exit 1

echo "Only landing/, docs or server files changed: skipping the app build."
exit 0
