import type { World } from './worldTypes';

/**
 * Demo builds only. The mock keeps everything in memory, so an owner's changes (Paystack keys,
 * online ordering, menu edits…) used to vanish on reload. This keeps the owner's settings on the
 * device (web: localStorage; phones: AsyncStorage), so what they switch on stays on.
 * Live data (orders, calls, sign-ins) is not kept. It is per device: another phone or browser
 * starts from the samples. The real server (Phase 5) replaces all of this.
 */

// Bump when the sample data changes, so a copy saved from older samples is ignored.
export const DEMO_MEMORY_VERSION = 2;
const KEY = 'cravins-demo-memory';

// Loaded only when the demo memory is used (the app turns it on, tests don't), so tests never
// need the phone's storage module.
function storage() {
  type Storage = typeof import('@react-native-async-storage/async-storage');
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded only when used, see above
  const module: Storage = require('@react-native-async-storage/async-storage');
  return module.default;
}

const PARTS = [
  'venues',
  'menus',
  'wifi',
  'notices',
  'paymentSettings',
  'offers',
  'tables',
  'customLinks',
  'business',
  'tax',
  'whatsappAlerts',
  'promos',
] as const satisfies readonly (keyof World)[];

type Saved = { version: number; parts: Partial<Pick<World, (typeof PARTS)[number]>> };

export function snapshotDemo(world: World): Saved {
  const parts: Record<string, unknown> = {};
  for (const part of PARTS) parts[part] = world[part];
  return { version: DEMO_MEMORY_VERSION, parts: parts as Saved['parts'] };
}

/** Puts saved settings back into a fresh world. Anything odd or out of date is ignored. */
export function restoreDemo(world: World, saved: unknown): void {
  if (typeof saved !== 'object' || saved === null) return;
  const { version, parts } = saved as Partial<Saved>;
  if (version !== DEMO_MEMORY_VERSION || typeof parts !== 'object' || parts === null) return;
  for (const part of PARTS) {
    if (part in parts) (world as Record<string, unknown>)[part] = parts[part];
  }
}

/** Reads the saved settings into `world`. Never throws: no storage just means the samples. */
export async function loadDemo(world: World): Promise<void> {
  try {
    const text = await storage().getItem(KEY);
    if (text) restoreDemo(world, JSON.parse(text));
  } catch {
    // Private browsing, full storage or a broken copy: start from the samples.
  }
}

let pending: ReturnType<typeof setTimeout> | null = null;

/** Saves the owner's settings a moment after a change (several changes in a row save once). */
export function saveDemoSoon(world: World): void {
  if (pending) clearTimeout(pending);
  pending = setTimeout(() => {
    pending = null;
    void storage()
      .setItem(KEY, JSON.stringify(snapshotDemo(world)))
      .catch(() => undefined);
  }, 300);
}
