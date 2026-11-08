import { useLocalSearchParams } from 'expo-router';
import { PayScreen } from '@/features/pay';

export default function PayRoute() {
  const { venue } = useLocalSearchParams<{ venue: string }>();
  return <PayScreen slug={venue ?? ''} />;
}
