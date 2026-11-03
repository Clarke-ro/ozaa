import { useLocalSearchParams } from 'expo-router';
import { TableEntryScreen } from '@/features/venue';

export default function TableEntryRoute() {
  const { venue, table } = useLocalSearchParams<{ venue: string; table: string }>();
  return <TableEntryScreen slug={venue ?? ''} table={table} />;
}
