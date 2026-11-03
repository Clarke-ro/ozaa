import { Redirect } from 'expo-router';
import { PosShell } from '@/features/owner';
import { PAYMENTS_ENABLED } from '@/lib/features';

export default function Route() {
  // The counter till takes cash and MoMo, so it goes with payments.
  if (!PAYMENTS_ENABLED) return <Redirect href="/owner/orders" />;
  return <PosShell />;
}
