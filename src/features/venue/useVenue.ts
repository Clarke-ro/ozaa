import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useVenue(slug: string) {
  return useQuery({ queryKey: ['venue', slug], queryFn: () => api.getVenue(slug) });
}

export function useStories(slug: string) {
  return useQuery({ queryKey: ['stories', slug], queryFn: () => api.listStories(slug) });
}

export function useOffers(slug: string) {
  return useQuery({ queryKey: ['offers', slug], queryFn: () => api.listOffers(slug) });
}

export function useWifi(slug: string) {
  return useQuery({ queryKey: ['wifi', slug], queryFn: () => api.getWifi(slug) });
}
