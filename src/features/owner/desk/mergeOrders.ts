/** The newest `updatedAt` in the list, or undefined when none of the orders carry one. */
export function latestUpdatedAt(items: readonly { updatedAt?: string }[]): string | undefined {
  let latest: string | undefined;
  for (const item of items) {
    if (!item.updatedAt) continue;
    if (!latest || item.updatedAt > latest) latest = item.updatedAt;
  }
  return latest;
}

/**
 * Folds a poll of changed orders into the list already on screen.
 * The first answer is kept as the server sent it. Later answers replace an order that moved
 * and add one that is new. The screen still shows the newest 300.
 */
export function mergeOrderPages<T extends { id: string; createdAt: string }>(
  previous: readonly T[] | null,
  incoming: readonly T[],
): T[] {
  if (!previous) return [...incoming];
  const byId = new Map<string, T>();
  for (const item of previous) byId.set(item.id, item);
  for (const item of incoming) byId.set(item.id, item);
  return [...byId.values()]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))
    .slice(0, 300);
}
