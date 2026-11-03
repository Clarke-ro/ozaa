import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { StateStorage } from 'zustand/middleware';

/**
 * Where sign-ins are kept: the owner's, and the guest's visit (table, order, calls).
 * Phones: the Keychain / Keystore via expo-secure-store, never AsyncStorage.
 * Web: sessionStorage, so the tokens go when the tab closes and never sit in long-lived storage.
 */
function webStore(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export const ownerSessionStorage: StateStorage =
  Platform.OS === 'web'
    ? {
        getItem: (key) => webStore()?.getItem(key) ?? null,
        setItem: (key, value) => webStore()?.setItem(key, value),
        removeItem: (key) => webStore()?.removeItem(key),
      }
    : {
        getItem: (key) => SecureStore.getItemAsync(key),
        setItem: (key, value) => SecureStore.setItemAsync(key, value),
        removeItem: (key) => SecureStore.deleteItemAsync(key),
      };
