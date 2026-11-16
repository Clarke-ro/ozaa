import { useLocalSearchParams } from 'expo-router';
import { TableOnly } from '@/features/session';
import { WaiterScreen } from '@/features/waiter';

export default function WaiterRoute() {
  const { venue } = useLocalSearchParams<{ venue: string }>();
  return (
    <TableOnly slug={venue ?? ''}>
      <WaiterScreen slug={venue ?? ''} />
    </TableOnly>
  );
}
