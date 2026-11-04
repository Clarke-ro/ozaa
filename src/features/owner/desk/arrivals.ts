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

export type ChimeState = { orders: Set<string> | null; calls: Set<string> | null };

/**
 * One check of the chime: given what we've seen so far and the latest ids, should it ring?
 * `null` ids mean "not loaded yet" or "this person doesn't hear these" (the kitchen and calls),
 * so that list is left as it was. Ids are remembered even with the sound off, so turning it
 * back on doesn't ring for old orders.
 */
export function chimeStep(
  state: ChimeState,
  input: { orderIds: readonly string[] | null; openCallIds: readonly string[] | null; on: boolean },
): { state: ChimeState; ring: boolean } {
  const orders = input.orderIds ? arrivals(state.orders, input.orderIds) : null;
  const calls = input.openCallIds ? arrivals(state.calls, input.openCallIds) : null;
  const fresh = (orders?.fresh ?? 0) + (calls?.fresh ?? 0);
  return {
    state: { orders: orders?.seen ?? state.orders, calls: calls?.seen ?? state.calls },
    ring: input.on && fresh > 0,
  };
}
