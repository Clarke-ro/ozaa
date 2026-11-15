import { useLocalSearchParams } from 'expo-router';
import { CustomerDetailScreen } from '@/features/owner/screens/customers/CustomerDetailScreen';

export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CustomerDetailScreen customerId={id ?? ''} />;
}
