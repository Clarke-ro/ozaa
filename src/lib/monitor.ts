import { Platform } from 'react-native';
import { DEMO } from './demo';
import { env } from './env';

type Client = typeof import('./sentryClient');
let loading: Promise<Client> | null = null;

/**
 * Sentry is loaded only when the first error happens, in its own file, so guests download
 * nothing extra on a normal visit (AGENTS.md: no big additions to the guest web bundle).
 * Collects nothing on its own: no tracing, no breadcrumbs, no default integrations.
 */
function sentry(dsn: string): Promise<Client> {
  loading ??= import('./sentryClient').then((client) => {
    client.startSentry(dsn, env.EXPO_PUBLIC_API_MODE === 'http' ? 'production' : 'demo');
    return client;
  });
  return loading;
}

/** Reports an unexpected error. Does nothing in the demo, off the web, or without a DSN. */
export function reportError(error: unknown): void {
  const dsn = env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn || DEMO || Platform.OS !== 'web') return;
  const err = error instanceof Error ? error : new Error(String(error));
  void sentry(dsn)
    .then((s) => s.captureException(err))
    .catch(() => undefined);
}

/** Catches errors nothing else did (a failed promise, a script error) on the web. Call once. */
export function watchUncaughtErrors(): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  window.addEventListener('error', (event) => reportError(event.error ?? event.message));
  window.addEventListener('unhandledrejection', (event) => reportError(event.reason));
}
