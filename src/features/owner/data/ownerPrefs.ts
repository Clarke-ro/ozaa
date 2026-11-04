import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type OwnerPrefs = {
  /** Play a chime when a new order or waiter call comes in. On by default: a busy floor can't watch a screen. */
  chime: boolean;
  setChime: (on: boolean) => void;
};

/** Small per-device settings for the owner app. No personal data, so plain AsyncStorage is fine. */
export const useOwnerPrefs = create<OwnerPrefs>()(
  persist(
    (set) => ({
      chime: true,
      setChime: (on) => set({ chime: on }),
    }),
    { name: 'ozaa-owner-prefs', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
