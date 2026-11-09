import { useLocalSearchParams } from 'expo-router';
import { OrderDetailScreen } from '@/features/owner';

export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <OrderDetailScreen orderId={id ?? ''} />;
}
