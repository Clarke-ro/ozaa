import { useLocalSearchParams } from 'expo-router';
import { HomeScreen } from '@/features/venue';

export default function VenueHomeRoute() {
  const { venue } = useLocalSearchParams<{ venue: string }>();
  return <HomeScreen slug={venue ?? ''} />;
}
