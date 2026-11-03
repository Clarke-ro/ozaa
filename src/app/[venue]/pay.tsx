import { Redirect, useLocalSearchParams } from 'expo-router';
import { PayScreen } from '@/features/pay';
import { PAYMENTS_ENABLED } from '@/lib/features';

export default function PayRoute() {
  const { venue } = useLocalSearchParams<{ venue: string }>();
  // Payments are off in this build: an old Pay link lands on the order instead.
  if (!PAYMENTS_ENABLED) return <Redirect href={`/${venue ?? ''}/status`} />;
  return <PayScreen slug={venue ?? ''} />;
}
