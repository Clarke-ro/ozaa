import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { isOwnerQuery } from '@/lib/queryPersist';
import { useOwnerSession } from '@/features/session';

/** Signs the owner out and wipes their cached data. Used by Settings and the sidebar. */
export function useSignOut() {
  const router = useRouter();
  const client = useQueryClient();
  const clearOwner = useOwnerSession((state) => state.clearOwner);
  return useCallback(() => {
    clearOwner();
    router.replace('/owner/login');
    // Drop this account's orders, customers and payouts so the next person to sign in on this
    // device never sees them, not even for a moment.
    client.removeQueries({ predicate: (query) => isOwnerQuery(query.queryKey) });
  }, [clearOwner, router, client]);
}
