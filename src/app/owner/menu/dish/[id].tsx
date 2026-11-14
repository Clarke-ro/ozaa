import { useLocalSearchParams } from 'expo-router';
import { DishEditScreen } from '@/features/owner';

export default function Route() {
  const { id, section } = useLocalSearchParams<{ id: string; section?: string }>();
  return <DishEditScreen dishId={id ?? 'new'} sectionId={section} />;
}
