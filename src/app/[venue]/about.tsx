import { useLocalSearchParams } from 'expo-router';
import { SimpleScreen } from '@/features/pages';
export default function Route() {
  const { venue } = useLocalSearchParams<{ venue: string }>();
  return <SimpleScreen slug={venue ?? ''} kind="about" />;
}
