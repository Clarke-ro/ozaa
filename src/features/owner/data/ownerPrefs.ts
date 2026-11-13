import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type OwnerPrefs = {
  /** Play a chime when a new order or waiter call comes in. On by default: a busy floor can't watch a screen. */
  chime: boolean;
  setChime: (on: boolean) => void;
  /** The sidebar folded to icons. Kept so every page, and the next visit, opens the same way. */
  sidebarCollapsed: boolean;
  /** Light, dark, or follow the device. Also saved on the profile so it follows the person. */
  appearance: 'light' | 'dark' | 'system';
  setAppearance: (appearance: 'light' | 'dark' | 'system') => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
};

/** Small per-device settings for the owner app. No personal data, so plain AsyncStorage is fine. */
export const useOwnerPrefs = create<OwnerPrefs>()(
  persist(
    (set) => ({
      chime: true,
      setChime: (on) => set({ chime: on }),
      sidebarCollapsed: false,
      appearance: 'system',
      setAppearance: (appearance) => set({ appearance }),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
    }),
    { name: 'cravins-owner-prefs', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
