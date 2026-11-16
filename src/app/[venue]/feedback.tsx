import { useLocalSearchParams } from 'expo-router';
import { TableOnly } from '@/features/session';
import { FeedbackScreen } from '@/features/pages';

export default function Route() {
  const { venue } = useLocalSearchParams<{ venue: string }>();
  return (
    <TableOnly slug={venue ?? ''}>
      <FeedbackScreen slug={venue ?? ''} />
    </TableOnly>
  );
}
