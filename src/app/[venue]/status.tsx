import { useLocalSearchParams } from 'expo-router';
import { StatusScreen } from '@/features/orders';

export default function StatusRoute() {
  const { venue } = useLocalSearchParams<{ venue: string }>();
  return <StatusScreen slug={venue ?? ''} />;
}
