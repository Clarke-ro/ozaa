import { useLocalSearchParams } from 'expo-router';
import { TableOnly } from '@/features/session';
import { WifiScreen } from '@/features/wifi';

export default function WifiRoute() {
  const { venue } = useLocalSearchParams<{ venue: string }>();
  return (
    <TableOnly slug={venue ?? ''}>
      <WifiScreen slug={venue ?? ''} />
    </TableOnly>
  );
}
