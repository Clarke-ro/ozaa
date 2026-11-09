import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { guestKeys } from '@/lib/queryKeys';
import { ownerKeys } from '../../data/keys';
import { inPersonMethods } from './MarkPaidSheet';

/**
 * The venue, plus the in-person ways it takes money, for "How did it pay?". What guests can pay
 * with is on the public venue, so waiters can read it too (no keys in it).
 */
export function useVenuePay(venueId: string) {
  const venue = useQuery({
    queryKey: ownerKeys.venue(venueId),
    queryFn: () => api.ownerGetVenue(venueId),
    enabled: Boolean(venueId),
  });
  const slug = venue.data?.slug ?? '';
  const publicVenue = useQuery({
    queryKey: guestKeys.venue(slug),
    queryFn: () => api.getVenue(slug),
    enabled: Boolean(slug),
  });
  return { venue, methods: inPersonMethods(publicVenue.data?.payMethods) };
}
