import { useState } from 'react';
import { changedFields } from './draft';

/**
 * A form on top of server data. Fields the owner has not touched keep showing the server value,
 * so a background refresh updates them; touched fields keep the owner's typing.
 *
 *   const draft = useDraft({ name: venue?.name ?? '' });
 *   draft.value.name; draft.set('name', 'Mama’s'); draft.dirty; draft.changes; draft.reset();
 */
export function useDraft<T extends Record<string, unknown>>(server: T) {
  const [edits, setEdits] = useState<Partial<T>>({});
  const value = { ...server, ...edits } as T;
  const changes = changedFields(server, edits);
  return {
    value,
    set: <K extends keyof T>(key: K, next: T[K]) =>
      setEdits((current) => ({ ...current, [key]: next })),
    /** Only the fields that differ from the server. */
    changes,
    dirty: Object.keys(changes).length > 0,
    reset: () => setEdits({}),
  };
}
