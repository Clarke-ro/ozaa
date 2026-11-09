import { Redirect } from 'expo-router';

// Payments are set up in Integrations now (each venue's own Paystack). Old links land there.
export default function Route() {
  return <Redirect href="/owner/integrations" />;
}
