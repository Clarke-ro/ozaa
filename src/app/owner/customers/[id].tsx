import { useLocalSearchParams } from 'expo-router';
import { CustomerDetailScreen } from '@/features/owner';

export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CustomerDetailScreen customerId={id ?? ''} />;
}
