import { useLocalSearchParams } from 'expo-router';
import { TableOnly } from '@/features/session';
import { GameScreen } from '@/features/game';
export default function Route() {
  const { venue } = useLocalSearchParams<{ venue: string }>();
  return (
    <TableOnly slug={venue ?? ''}>
      <GameScreen slug={venue ?? ''} />
    </TableOnly>
  );
}
