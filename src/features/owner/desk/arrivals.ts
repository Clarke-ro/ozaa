/**
 * Which ids are new since the last check, for the "new order" chime.
 * `seen` is null before the first load; that load only fills `seen`, so opening the app
 * doesn't ring for every order already waiting. Ids are never forgotten while the app is open,
 * so a ticket that drops out of a list and comes back stays quiet.
 */
export function arrivals(
  seen: ReadonlySet<string> | null,
  ids: readonly string[],
): { seen: Set<string>; fresh: number } {
  const next = new Set(seen ?? []);
  let fresh = 0;
  for (const id of ids) {
    if (next.has(id)) continue;
    next.add(id);
    if (seen) fresh += 1;
  }
  return { seen: next, fresh };
}
