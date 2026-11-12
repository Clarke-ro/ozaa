import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type OwnerPrefs = {
  /** Play a chime when a new order or waiter call comes in. On by default: a busy floor can't watch a screen. */
  chime: boolean;
  setChime: (on: boolean) => void;
  /** The sidebar folded to icons. Kept so every page, and the next visit, opens the same way. */
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
};

/** Small per-device settings for the owner app. No personal data, so plain AsyncStorage is fine. */
export const useOwnerPrefs = create<OwnerPrefs>()(
  persist(
    (set) => ({
      chime: true,
      setChime: (on) => set({ chime: on }),
      sidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
    }),
    { name: 'cravins-owner-prefs', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
