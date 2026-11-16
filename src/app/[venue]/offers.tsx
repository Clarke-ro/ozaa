import { useLocalSearchParams } from 'expo-router';
import { TableOnly } from '@/features/session';
import { SimpleScreen } from '@/features/pages';
export default function Route() {
  const { venue } = useLocalSearchParams<{ venue: string }>();
  return (
    <TableOnly slug={venue ?? ''}>
      <SimpleScreen slug={venue ?? ''} kind="offers" />
    </TableOnly>
  );
}
