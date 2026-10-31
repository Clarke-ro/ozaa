import { useLocalSearchParams } from 'expo-router';
import { WifiScreen } from '@/features/wifi';

export default function WifiRoute() {
  const { venue } = useLocalSearchParams<{ venue: string }>();
  return <WifiScreen slug={venue ?? ''} />;
}