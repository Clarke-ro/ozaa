import { useLocalSearchParams } from 'expo-router';
import { MyOrdersScreen } from '@/features/history';

export default function MyOrdersRoute() {
  const { venue } = useLocalSearchParams<{ venue: string }>();
  return <MyOrdersScreen slug={venue ?? ''} />;
}
