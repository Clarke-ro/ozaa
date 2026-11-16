import { useLocalSearchParams } from 'expo-router';
import { TableOnly } from '@/features/session';
import { LoyaltyScreen } from '@/features/loyalty';
export default function Route() {
  const { venue } = useLocalSearchParams<{ venue: string }>();
  return (
    <TableOnly slug={venue ?? ''}>
      <LoyaltyScreen slug={venue ?? ''} />
    </TableOnly>
  );
}
