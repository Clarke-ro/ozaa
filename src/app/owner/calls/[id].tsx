import { useLocalSearchParams } from 'expo-router';
import { CallDetailScreen } from '@/features/owner/screens/calls/CallDetailScreen';

export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CallDetailScreen callId={id ?? ''} />;
}
