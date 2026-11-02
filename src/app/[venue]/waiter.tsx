import { useLocalSearchParams } from 'expo-router';
import { WaiterScreen } from '@/features/waiter';

export default function WaiterRoute() {
  const { venue } = useLocalSearchParams<{ venue: string }>();
  return <WaiterScreen slug={venue ?? ''} />;
}
