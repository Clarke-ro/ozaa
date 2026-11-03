import { useLocalSearchParams } from 'expo-router';
import { AboutScreen } from '@/features/pages';

export default function Route() {
  const { venue } = useLocalSearchParams<{ venue: string }>();
  return <AboutScreen slug={venue ?? ''} />;
}
