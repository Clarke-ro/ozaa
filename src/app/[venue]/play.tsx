import { useLocalSearchParams } from 'expo-router';
import { GameScreen } from '@/features/game';
export default function Route() {
  const { venue } = useLocalSearchParams<{ venue: string }>();
  return <GameScreen slug={venue ?? ''} />;
}
