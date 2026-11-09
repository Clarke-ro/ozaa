import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { env } from '@/lib/env';

/**
 * Opens Paystack's card page (POST /payments says how).
 * - Web: the same tab. Paystack's callback brings the guest back to `/{slug}/pay?reference=…`,
 *   and the pay screen checks that reference. Returns 'away'.
 * - App: the in-app browser. When the guest closes it we check the payment. Returns 'back'.
 * - Mock: the card page is a screen in this app, so we move to it without a page load, which
 *   would wipe the in-browser mock and the order with it.
 */
export async function openCheckout(
  url: string,
  go: (path: string) => void,
): Promise<'away' | 'back'> {
  if (env.EXPO_PUBLIC_API_MODE === 'mock') {
    const page = new URL(url);
    go(`${page.pathname}${page.search}`);
    return 'away';
  }
  if (Platform.OS === 'web') {
    window.location.assign(url);
    return 'away';
  }
  await WebBrowser.openBrowserAsync(url);
  return 'back';
}
