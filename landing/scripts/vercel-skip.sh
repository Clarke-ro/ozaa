#!/usr/bin/env bash
# Vercel's "Ignored Build Step" for the cravins-landing project (see landing/vercel.json).
# Runs from landing/ (the project's root directory). Exit 0 = skip, exit 1 = build, never
# anything else (any other exit code is reported as a failed deployment).
#
# Why: the landing site only changes when landing/ changes. App, server and docs commits
# shouldn't rebuild it or use up the daily deploy limit.

if [ "$VERCEL_GIT_PREVIOUS_SHA" = "$VERCEL_GIT_COMMIT_SHA" ]; then exit 1; fi

base="$(bash ../scripts/vercel-base.sh)"
if [ -z "$base" ]; then echo "No earlier commit to compare with: building."; exit 1; fi

git diff --quiet "$base" HEAD -- . || exit 1
echo "Nothing in landing/ changed since $base: skipping the landing build."
exit 0
