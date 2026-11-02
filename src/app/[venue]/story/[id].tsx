import { useLocalSearchParams } from 'expo-router';
import { StoryScreen } from '@/features/reviews';
export default function Route() {
  const { venue, id } = useLocalSearchParams<{ venue: string; id: string }>();
  return <StoryScreen slug={venue ?? ''} id={id ?? ''} />;
}
