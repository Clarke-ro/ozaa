import { useLocalSearchParams } from 'expo-router';
import { ReviewScreen } from '@/features/reviews';
export default function Route() {
  const { venue } = useLocalSearchParams<{ venue: string }>();
  return <ReviewScreen slug={venue ?? ''} />;
}
