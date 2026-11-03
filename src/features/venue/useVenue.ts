import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { guestKeys } from '@/lib/queryKeys';

export function useVenue(slug: string) {
  return useQuery({ queryKey: guestKeys.venue(slug), queryFn: () => api.getVenue(slug) });
}

export function useOffers(slug: string) {
  return useQuery({ queryKey: guestKeys.offers(slug), queryFn: () => api.listOffers(slug) });
}

export function useWifi(slug: string) {
  return useQuery({ queryKey: guestKeys.wifi(slug), queryFn: () => api.getWifi(slug) });
}
