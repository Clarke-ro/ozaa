import { useLocalSearchParams } from 'expo-router';
import { OrderSheet } from '@/features/orders';

export default function OrderRoute() {
  const { venue } = useLocalSearchParams<{ venue: string }>();
  return <OrderSheet slug={venue ?? ''} />;
}
