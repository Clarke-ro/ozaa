import type { ReactNode } from 'react';
import { ClerkProvider } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { env } from '@/lib/env';

/**
 * Starts Clerk around the owner pages in real-server builds. On phones the session is kept in
 * expo-secure-store (tokenCache); on the web Clerk keeps it itself. Guest pages never mount this,
 * so Clerk's script only loads when someone opens the owner app.
 */
export function OwnerClerkProvider({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider publishableKey={env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
      {children}
    </ClerkProvider>
  );
}
