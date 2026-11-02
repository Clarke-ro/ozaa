import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { ownerSessionStorage } from './ownerStorage';

/**
 * The calls this guest made at this table, kept for the visit (saved like the guest session,
 * so a refresh keeps them) so Call waiter and the bell can show each one's live status.
 */
export const useMyCalls = create<{
  ids: string[];
  add: (ids: string[]) => void;
  clear: () => void;
}>()(
  persist(
    (set) => ({
      ids: [],
      // The table has one open call at a time, so a repeat id is the same call: keep it once.
      add: (ids) => set((s) => ({ ids: [...new Set([...ids, ...s.ids])] })),
      clear: () => set({ ids: [] }),
    }),
    {
      name: 'ozaa-guest-calls',
      storage: createJSONStorage(() => ownerSessionStorage),
      partialize: ({ ids }) => ({ ids }),
    },
  ),
);
