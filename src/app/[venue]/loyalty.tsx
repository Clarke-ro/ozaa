import { useLocalSearchParams } from 'expo-router';
import { LoyaltyScreen } from '@/features/loyalty';
export default function Route() {
  const { venue } = useLocalSearchParams<{ venue: string }>();
  return <LoyaltyScreen slug={venue ?? ''} />;
}
