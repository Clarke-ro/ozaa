/** The edited fields whose value differs from the server's. Arrays and objects compare by content. */
export function changedFields<T extends Record<string, unknown>>(
  server: T,
  edits: Partial<T>,
): Partial<T> {
  const out: Partial<T> = {};
  for (const key of Object.keys(edits) as (keyof T)[]) {
    if (JSON.stringify(edits[key]) !== JSON.stringify(server[key])) out[key] = edits[key];
  }
  return out;
}
