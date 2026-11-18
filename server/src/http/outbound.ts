/** How long an outside service (Paystack, SMS, Clerk, storage) may take before we stop waiting. */
export const OUTBOUND_TIMEOUT_MS = 8_000;

/** Aborts a `fetch` when the outside service is too slow. Node throws a TimeoutError. */
export function outboundSignal(ms = OUTBOUND_TIMEOUT_MS): AbortSignal {
  return AbortSignal.timeout(ms);
}

/** True when a call was stopped because it took too long, by us or by `AbortSignal.timeout`. */
export function isTimeout(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === 'TimeoutError' ||
      error.name === 'AbortError' ||
      error.name === 'UpstreamTimeout')
  );
}

/**
 * Stops waiting for a promise that we cannot abort (Clerk's client has no cancel). The underlying
 * call may still finish later. The HTTP request does not stay open until it does.
 */
export async function withTimeout<T>(work: Promise<T>, ms = OUTBOUND_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          const error = new Error('The request took too long');
          error.name = 'UpstreamTimeout';
          reject(error);
        }, ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
