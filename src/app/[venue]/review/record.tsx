import { useLocalSearchParams } from 'expo-router';
import { RecordScreen } from '@/features/reviews';
export default function Route() {
  const { venue } = useLocalSearchParams<{ venue: string }>();
  return <RecordScreen slug={venue ?? ''} />;
}
