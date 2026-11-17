import { captureException, init } from '@sentry/browser';
import { scrubEvent } from './monitorScrub';

/**
 * The only parts of Sentry the app uses, imported by name so the build leaves the rest out
 * (session replay, feedback widgets, tracing). Loaded on the first error only (monitor.ts).
 */
export function startSentry(dsn: string, environment: string): void {
  init({
    dsn,
    environment,
    sendDefaultPii: false,
    defaultIntegrations: false,
    integrations: [],
    tracesSampleRate: 0,
    beforeSend: (event) => scrubEvent(event),
  });
}

export { captureException };
