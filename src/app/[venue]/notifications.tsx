import { useLocalSearchParams } from 'expo-router';
import { GuestNotificationsScreen } from '@/features/notices';

export default function NotificationsRoute() {
  const { venue } = useLocalSearchParams<{ venue: string }>();
  return <GuestNotificationsScreen slug={venue ?? ''} />;
}
