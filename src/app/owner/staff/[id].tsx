import { useLocalSearchParams } from 'expo-router';
import { StaffDetailScreen } from '@/features/owner/screens/staff/StaffDetailScreen';

export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <StaffDetailScreen memberId={id ?? ''} />;
}
