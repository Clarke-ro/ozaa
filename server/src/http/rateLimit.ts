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
    /** Gives back the newest hit. A send that was refused after being counted calls this. */
    drop(key: string): void {
      const recent = hits.get(key);
      if (!recent?.length) return;
      recent.pop();
      if (recent.length === 0) hits.delete(key);
    },
    size: () => hits.size,
  };
}

/**
 * How many guest writes one minute may hold.
 * A session is one phone's visit. The address cap is only a backstop: a dining room and a mobile
 * network put many real guests behind one public address, and they must not block each other.
 */
export const GUEST_NEW_VISITS_PER_MIN = 600;
export const GUEST_SESSION_WRITES_PER_MIN = 60;
export const GUEST_IP_WRITES_PER_MIN = 2_000;

/** Heroku's router adds the caller's address last; earlier entries can be faked by the caller. */
export function clientIp(forwardedFor: string | undefined): string {
  return forwardedFor?.split(',').at(-1)?.trim() || 'unknown';
}
