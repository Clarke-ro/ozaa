import { Redirect } from 'expo-router';
import { PaymentsScreen } from '@/features/owner';
import { PAYMENTS_ENABLED } from '@/lib/features';

export default function Route() {
  if (!PAYMENTS_ENABLED) return <Redirect href="/owner/orders" />;
  return <PaymentsScreen />;
}
