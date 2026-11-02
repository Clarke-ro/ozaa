import { create } from 'zustand';

/**
 * The calls this guest made at this table, kept while they move around the app so the
 * Call waiter page can show each one's live status when they come back.
 */
export const useMyCalls = create<{
  ids: string[];
  add: (ids: string[]) => void;
  clear: () => void;
}>((set) => ({
  ids: [],
  // The table has one open call at a time, so a repeat id is the same call: keep it once.
  add: (ids) => set((s) => ({ ids: [...new Set([...ids, ...s.ids])] })),
  clear: () => set({ ids: [] }),
}));
