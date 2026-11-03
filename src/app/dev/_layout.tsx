import { Redirect, Stack } from 'expo-router';
import { env } from '@/lib/env';

/**
 * Dev pages (the UI gallery and the mock card checkout) are tools for the mock build.
 * A build that talks to a real server sends them home, so guests never land on them.
 */
export default function DevLayout() {
  if (env.EXPO_PUBLIC_API_MODE !== 'mock') return <Redirect href="/" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
