import { useLocalSearchParams } from 'expo-router';
import { CallDetailScreen } from '@/features/owner';

export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CallDetailScreen callId={id ?? ''} />;
}
