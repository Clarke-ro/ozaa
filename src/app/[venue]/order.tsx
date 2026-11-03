import { useLocalSearchParams } from 'expo-router';
import { OrderScreen } from '@/features/orders';

export default function OrderRoute() {
  const { venue } = useLocalSearchParams<{ venue: string }>();
  return <OrderScreen slug={venue ?? ''} />;
}
