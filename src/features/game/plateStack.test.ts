import { createStack, dropAligned, dropPlate, plateSpeed, stepStack } from './plateStack';

test('sixteen aligned drops score 16 and earn the stamp', () => {
  let state = dropPlate(createStack());
  expect(state.kind).toBe('playing');
  for (let tap = 0; tap < 16; tap += 1) {
    state = dropAligned(state, { minScore: 15, alreadyToday: false });
  }
  expect(state.score).toBe(16);
  expect(state.stamp).toBe(true);
  expect(state.kind).toBe('playing');
});

test('a complete miss ends the round and keeps the score', () => {
  let state = dropPlate(createStack());
  for (let tap = 0; tap < 16; tap += 1)
    state = dropAligned(state, { minScore: 15, alreadyToday: false });
  const previous = state.stack[state.stack.length - 1];
  expect(previous).toBeDefined();
  if (!state.current || !previous) throw new Error('plate');
  state = dropPlate({ ...state, current: { ...state.current, x: previous.x + previous.w + 40 } });
  expect(state.kind).toBe('over');
  expect(state.score).toBe(16);
});

test('speed climbs with the score, and the plate moves', () => {
  expect(plateSpeed(0)).toBe(150);
  expect(plateSpeed(11)).toBe(271);
  expect(plateSpeed(100)).toBe(420);
  const moved = stepStack(dropPlate(createStack()), 0.016);
  expect(moved.current?.x).not.toBe(dropPlate(createStack()).current?.x);
});
