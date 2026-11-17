/**
 * Counts each caller's requests over a sliding window, in memory. One Basic dyno serves every
 * request, so memory is enough; a restart clears the counts. Old callers are swept out as the
 * window moves, so the map never keeps growing.
 */
export function slidingWindow(options: { limit: number; windowMs: number; now: () => number }) {
  const hits = new Map<string, number[]>();
  let lastSweep = 0;

  const sweep = (now: number) => {
    if (now - lastSweep < options.windowMs) return;
    lastSweep = now;
    for (const [key, times] of hits) {
      if (times.every((t) => t <= now - options.windowMs)) hits.delete(key);
    }
  };

  return {
    /** Counts one request; false when this caller is over the limit (the request is not counted). */
    hit(key: string): boolean {
      const now = options.now();
      sweep(now);
      const recent = (hits.get(key) ?? []).filter((t) => t > now - options.windowMs);
      if (recent.length >= options.limit) {
        hits.set(key, recent);
        return false;
      }
      recent.push(now);
      hits.set(key, recent);
      return true;
    },
    size: () => hits.size,
  };
}

/** Heroku's router adds the caller's address last; earlier entries can be faked by the caller. */
export function clientIp(forwardedFor: string | undefined): string {
  return forwardedFor?.split(',').at(-1)?.trim() || 'unknown';
}
