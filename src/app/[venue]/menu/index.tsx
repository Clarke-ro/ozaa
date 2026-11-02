import { useLocalSearchParams } from 'expo-router';
import { MenuScreen } from '@/features/menu';

export default function MenuRoute() {
  const { venue } = useLocalSearchParams<{ venue: string }>();
  return <MenuScreen slug={venue ?? ''} />;
}
