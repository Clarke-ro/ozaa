import { Redirect } from 'expo-router';
import { PosShell } from '@/features/owner';
import { PREVIEWS_ENABLED } from '@/lib/features';

export default function Route() {
  // The counter till is a roadmap preview on sample data.
  if (!PREVIEWS_ENABLED) return <Redirect href="/owner/orders" />;
  return <PosShell />;
}
