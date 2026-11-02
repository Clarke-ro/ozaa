import { useLocalSearchParams } from 'expo-router';
import { FeedbackScreen } from '@/features/pages';

export default function Route() {
  const { venue } = useLocalSearchParams<{ venue: string }>();
  return <FeedbackScreen slug={venue ?? ''} />;
}
