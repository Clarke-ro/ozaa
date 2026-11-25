import { useLocalSearchParams } from 'expo-router';
import { IntegrationPage } from '@/features/owner/screens/integrations/pages/IntegrationPage';

export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <IntegrationPage id={id ?? ''} />;
}
