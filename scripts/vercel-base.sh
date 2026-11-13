#!/usr/bin/env bash
# Shared by the Vercel "Ignored Build Step" scripts. Prints the commit to compare HEAD with,
# or nothing when there is none we can read (then the caller builds).
#
# Vercel compares with the last commit it deployed (VERCEL_GIT_PREVIOUS_SHA). Its clone is
# shallow, so that commit is often missing, and a plain `git diff` against it crashes with
# "bad object" (exit 128), which Vercel reports as a failed deployment. So: use it if present,
# else try to fetch it, else fall back to the commit before HEAD (for a merged PR, that's the
# whole PR).
base="${VERCEL_GIT_PREVIOUS_SHA:-}"
if [ -n "$base" ] && ! git cat-file -e "$base^{commit}" 2>/dev/null; then
  git fetch --quiet --depth=50 origin "$base" 2>/dev/null || true
fi
if [ -n "$base" ] && git cat-file -e "$base^{commit}" 2>/dev/null; then
  echo "$base"
elif git cat-file -e "HEAD^{commit}" 2>/dev/null && git rev-parse --verify --quiet HEAD^ >/dev/null; then
  echo "HEAD^"
fi
