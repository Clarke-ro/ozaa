import { useLocalSearchParams } from 'expo-router';
import { ReceiptScreen } from '@/features/pay';

export default function ReceiptRoute() {
  const { venue, reference } = useLocalSearchParams<{ venue: string; reference?: string }>();
  return <ReceiptScreen slug={venue ?? ''} reference={reference ?? ''} />;
}
