/**
 * Each page's code is its own file, downloaded the first time the page opens. That download fails
 * when the phone is offline, or after a new version is deployed (the old file names are gone).
 * Neither is a bug in the page, so the crash screen handles them differently.
 */
export function isChunkLoadError(error: Error): boolean {
  return error.name === 'AsyncRequireError' || /^Loading module .+ failed/.test(error.message);
}

// The last page that opened. When a page's file fails to load, the router falls back to "/", so
// the crash screen puts this back before trying again (AppErrorBoundary).
let lastPath: string | null = null;
export const rememberPath = (path: string) => {
  lastPath = path;
};
export const lastOpenedPath = () => lastPath;

// Reload at most once a minute: if the new version is broken too, the crash screen stays instead
// of the page reloading for ever.
const RELOAD_GAP_MS = 60_000;

/** True when it's safe to reload for a new version, given when we last did (or null). */
export function shouldReloadForUpdate(lastReloadAt: number | null, now: number): boolean {
  return lastReloadAt === null || now - lastReloadAt > RELOAD_GAP_MS;
}
