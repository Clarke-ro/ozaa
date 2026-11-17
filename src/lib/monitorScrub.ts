/**
 * What leaves the app in an error report: the error's type, message and stack, and the page path.
 * Never query strings (payment references), headers (tokens), cookies, the person or breadcrumbs
 * (AGENTS.md privacy rules, Ghana's Act 843).
 */
export function scrubEvent<T extends { request?: { url?: string } }>(event: T): T {
  const url = event.request?.url?.split('?')[0]?.split('#')[0];
  return {
    ...event,
    request: url ? { url } : undefined,
    user: undefined,
    breadcrumbs: undefined,
    extra: undefined,
  };
}
