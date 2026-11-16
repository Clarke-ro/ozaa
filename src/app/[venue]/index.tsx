import { useLocalSearchParams } from 'expo-router';
import { OnlineMenuScreen } from '@/features/online';

// The venue's own link: online ordering, menu first. Table guests use /[venue]/t/[table].
export default function VenueLinkRoute() {
  const { venue } = useLocalSearchParams<{ venue: string }>();
  return <OnlineMenuScreen slug={venue ?? ''} />;
}
