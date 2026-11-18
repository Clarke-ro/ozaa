/**
 * Remembers one value per key for a few seconds. Staff at the same venue poll the dashboard
 * together, so they share one answer instead of each running the queries.
 * The clock is the caller's (`deps.now`), so a test can move time past the window.
 */
export function memoFor<T>(ttlMs: number, now: () => number) {
  const box = new Map<string, { at: number; value: T }>();
  return {
    async read(key: string, load: () => Promise<T>): Promise<T> {
      const at = now();
      const hit = box.get(key);
      if (hit && at - hit.at < ttlMs) return hit.value;
      const value = await load();
      box.set(key, { at: now(), value });
      if (box.size > 400) {
        const fresh = now();
        for (const [id, row] of box) if (fresh - row.at >= ttlMs) box.delete(id);
      }
      return value;
    },
  };
}
