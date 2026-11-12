import { Redirect } from 'expo-router';

// Sections are edited on the Menu page now (its Sections button). Old links land there.
export default function Route() {
  return <Redirect href="/owner/menu" />;
}
