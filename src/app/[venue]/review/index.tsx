import { useLocalSearchParams } from 'expo-router';
import { TableOnly } from '@/features/session';
import { ReviewScreen } from '@/features/reviews';
export default function Route() {
  const { venue } = useLocalSearchParams<{ venue: string }>();
  return (
    <TableOnly slug={venue ?? ''}>
      <ReviewScreen slug={venue ?? ''} />
    </TableOnly>
  );
}
