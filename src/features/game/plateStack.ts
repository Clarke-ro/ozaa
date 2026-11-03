/** Tuning from the table prototype. One point per plate. A total miss ends the round. */
export const PLAY_WIDTH = 358;
export const PLAY_HEIGHT = 380;
export const PLATE_HEIGHT = 22;
export const BASE_WIDTH = 210;
const SNAP_PX = 4;
const PERFECT_EVERY = 3;
const PERFECT_BONUS = 10;

export type Plate = { x: number; w: number };
export type FallingPlate = { x: number; w: number; y: number; vy: number };
export type MovingPlate = { x: number; w: number };

export type StackState = {
  kind: 'ready' | 'playing' | 'over';
  score: number;
  perfect: number;
  stack: Plate[];
  current: MovingPlate | null;
  dir: 1 | -1;
  falling: FallingPlate[];
  stamp: boolean;
};

export type StampRule = { minScore: number; alreadyToday: boolean };

export const SAMPLE_BOARD = [
  { nickname: 'Kwame', score: 23, sample: true },
  { nickname: 'Ama', score: 19, sample: true },
  { nickname: 'Yaw', score: 16, sample: true },
  { nickname: 'Esi', score: 12, sample: true },
  { nickname: 'Kojo', score: 9, sample: true },
] as const;

export type BoardRow = { nickname: string; score: number; sample?: boolean; mine?: boolean };

export function plateSpeed(score: number): number {
  return Math.min(150 + score * 11, 420);
}

export function createStack(): StackState {
  const base: Plate = { x: (PLAY_WIDTH - BASE_WIDTH) / 2, w: BASE_WIDTH };
  const state: StackState = {
    kind: 'ready',
    score: 0,
    perfect: 0,
    stack: [base],
    current: null,
    dir: 1,
    falling: [],
    stamp: false,
  };
  return spawn(state);
}

function spawn(state: StackState): StackState {
  const previous = state.stack[state.stack.length - 1];
  if (!previous) return state;
  const dir = state.dir;
  const current: MovingPlate = {
    x: dir > 0 ? previous.x - previous.w - 8 : previous.x + previous.w + 8,
    w: previous.w,
  };
  return { ...state, current, dir: dir === 1 ? -1 : 1 };
}

function withStamp(state: StackState, rule: StampRule | null): StackState {
  if (!rule || state.stamp || rule.alreadyToday || state.score < rule.minScore) return state;
  return { ...state, stamp: true };
}

export function dropPlate(state: StackState, rule: StampRule | null = null): StackState {
  if (state.kind === 'ready') return { ...state, kind: 'playing' };
  if (state.kind !== 'playing' || !state.current) return state;
  const previous = state.stack[state.stack.length - 1];
  const current = { ...state.current };
  if (!previous) return state;
  const left = Math.max(previous.x, current.x);
  const right = Math.min(previous.x + previous.w, current.x + current.w);
  const overlap = right - left;
  if (overlap <= 0) {
    return {
      ...state,
      kind: 'over',
      current: null,
      falling: [...state.falling, { x: current.x, w: current.w, y: state.stack.length, vy: 0 }],
    };
  }
  let perfect = state.perfect;
  const falling = [...state.falling];
  if (Math.abs(current.x - previous.x) < SNAP_PX) {
    current.x = previous.x;
    perfect += 1;
    if (perfect % PERFECT_EVERY === 0) {
      current.w = Math.min(BASE_WIDTH, current.w + PERFECT_BONUS);
      current.x = Math.max(0, current.x - PERFECT_BONUS / 2);
    }
  } else {
    perfect = 0;
    const cutX = current.x < previous.x ? current.x : right;
    falling.push({ x: cutX, w: current.w - overlap, y: state.stack.length, vy: 0 });
    current.x = left;
    current.w = overlap;
  }
  const next: StackState = {
    ...state,
    score: state.score + 1,
    perfect,
    stack: [...state.stack, { x: current.x, w: current.w }],
    falling,
    current,
  };
  return spawn(withStamp(next, rule));
}

/** Place the moving plate on the one below, then drop. Used to replay a perfect run. */
export function dropAligned(state: StackState, rule: StampRule | null = null): StackState {
  const previous = state.stack[state.stack.length - 1];
  if (state.kind !== 'playing' || !state.current || !previous) return dropPlate(state, rule);
  return dropPlate({ ...state, current: { ...state.current, x: previous.x } }, rule);
}

export function stepStack(state: StackState, dtSeconds: number): StackState {
  if (state.kind !== 'playing' || !state.current) return state;
  const previous = state.stack[state.stack.length - 1];
  if (!previous) return state;
  const dt = Math.min(0.05, dtSeconds);
  let x = state.current.x - state.dir * plateSpeed(state.score) * dt;
  let dir = state.dir;
  const low = previous.x - state.current.w - 8;
  const high = previous.x + previous.w + 8;
  if (x > high) {
    x = high;
    dir = 1;
  }
  if (x < low) {
    x = low;
    dir = -1;
  }
  const falling = state.falling
    .map((plate) => ({
      ...plate,
      vy: plate.vy + 900 * dt,
      y: plate.y - ((plate.vy + 900 * dt) * dt) / PLATE_HEIGHT,
    }))
    .filter((plate) => plate.y > -8);
  return { ...state, dir, current: { ...state.current, x }, falling };
}

export function topOfBoard(saved: readonly BoardRow[]): BoardRow[] {
  return [...saved, ...SAMPLE_BOARD].sort((left, right) => right.score - left.score).slice(0, 5);
}
