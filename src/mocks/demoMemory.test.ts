import { createWorld } from './world';
import { restoreDemo, snapshotDemo, DEMO_MEMORY_VERSION } from './demoMemory';

// Saved settings live in AsyncStorage; in tests, in memory.
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

test('owner settings come back after a reload; live orders and sign-ins do not', () => {
  const world = createWorld(Date.now());
  const bean = Object.values(world.venues).find((v) => v.slug === 'bean-there');
  if (!bean) throw new Error('no sample venue');
  world.venues['bean-there'] = { ...bean, name: 'Bean There Too' };
  world.access.set('acc_x', { phone: '+233240000001', purpose: 'owner_login' });
  const saved = JSON.parse(JSON.stringify(snapshotDemo(world)));

  const fresh = createWorld(Date.now());
  restoreDemo(fresh, saved);
  expect(fresh.venues['bean-there']?.name).toBe('Bean There Too');
  expect(fresh.access.has('acc_x')).toBe(false);
  expect(saved).not.toHaveProperty('parts.orders');
});

test('a saved copy from older sample data is ignored, so new samples show', () => {
  const fresh = createWorld(Date.now());
  const before = fresh.venues['bean-there']?.name;
  restoreDemo(fresh, { version: DEMO_MEMORY_VERSION - 1, parts: { venues: {} } });
  restoreDemo(fresh, null);
  restoreDemo(fresh, 'not json at all');
  expect(fresh.venues['bean-there']?.name).toBe(before);
});
