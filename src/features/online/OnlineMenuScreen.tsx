import { useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MenuScreen } from '@/features/menu';
import { useGuestSession } from '@/features/session';
import { useVenue } from '@/features/venue';
import { ErrorState, LoadingState } from '@/ui/states';
import { OnlineHero } from './OnlineHero';

/**
 * The venue's own link (/slug): online ordering, menu first. Opening it ends any table visit at
 * this venue in this browser, so a customer ordering online never sends an order to a table
 * (table guests have their own home at /slug/t/12).
 */
export function OnlineMenuScreen({ slug }: { slug: string }) {
  const insets = useSafeAreaInsets();
  const venue = useVenue(slug);
  const startOnlineVisit = useGuestSession((state) => state.startOnlineVisit);
  useEffect(() => startOnlineVisit(slug), [slug, startOnlineVisit]);

  if (venue.isLoading) return <LoadingState />;
  if (venue.isError || !venue.data) return <ErrorState onRetry={() => void venue.refetch()} />;
  return <MenuScreen slug={slug} hero={<OnlineHero venue={venue.data} topInset={insets.top} />} />;
}
