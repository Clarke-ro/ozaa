import { useLocalSearchParams } from 'expo-router';
import { ItemScreen } from '@/features/menu';

export default function ItemRoute() {
  const { venue, item } = useLocalSearchParams<{ venue: string; item: string }>();
  return <ItemScreen slug={venue ?? ''} itemId={item ?? ''} />;
}
