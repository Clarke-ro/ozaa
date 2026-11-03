import { Redirect } from 'expo-router';
import { MarketingShell } from '@/features/owner';
import { PREVIEWS_ENABLED } from '@/lib/features';

export default function Route() {
  // A roadmap preview on sample data: hidden unless PREVIEWS_ENABLED is true.
  if (!PREVIEWS_ENABLED) return <Redirect href="/owner/more" />;
  return <MarketingShell />;
}
