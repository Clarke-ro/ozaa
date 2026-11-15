import type { QueryClient, QueryKey } from '@tanstack/react-query';

/** Invalidates each owner query without making a successful mutation wait for its refetch. */
export function invalidateOwnerQueries(
  queryClient: QueryClient,
  queryKeys: readonly QueryKey[],
): void {
  for (const queryKey of queryKeys) {
    void queryClient.invalidateQueries({ queryKey });
  }
}
