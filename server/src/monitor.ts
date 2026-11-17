import * as Sentry from '@sentry/node';
import type { ErrorEvent } from '@sentry/node';

/** Sends an unexpected error to monitoring. Expected answers (a Problem) are never reported. */
export type Report = (error: Error) => void;

/**
 * What leaves the server in an error report: the error's type, message and stack, and the route
 * it happened on. Never headers (tokens), bodies (names, phones, addresses), query strings,
 * cookies, the caller's address or breadcrumbs (AGENTS.md privacy rules, Ghana's Act 843).
 */
export function scrub(event: ErrorEvent): ErrorEvent | null {
  const url = event.request?.url?.split('?')[0];
  return {
    ...event,
    request: url ? { url, method: event.request?.method } : undefined,
    user: undefined,
    breadcrumbs: undefined,
    extra: undefined,
    contexts: { runtime: event.contexts?.runtime, os: event.contexts?.os },
  };
}

/**
 * Sentry for the server, when SENTRY_DSN is set. Nothing is collected on its own: no request
 * tracing, no breadcrumbs, no default integrations. Only errors we hand to it, scrubbed first.
 */
export function sentryReport(dsn: string, environment: string): Report {
  Sentry.init({
    dsn,
    environment,
    sendDefaultPii: false,
    defaultIntegrations: false,
    integrations: [],
    tracesSampleRate: 0,
    beforeSend: scrub,
  });
  return (error) => {
    Sentry.captureException(error);
  };
}
