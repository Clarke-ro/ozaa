import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ownerKeys } from './keys';

/** The signed-in person as the server knows them: name, photo and app preferences. */
export function useMe() {
  return useQuery({ queryKey: ownerKeys.me(), queryFn: () => api.getMe(), staleTime: 60_000 });
}
