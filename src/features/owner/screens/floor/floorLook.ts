import type { FloorTone } from '@/theme/palette';
import type { FloorStatus } from '../../floor/floorStatus';

/** Four colour families: empty, occupied, paying, and calling for a waiter. */
export const TONE_OF: Record<FloorStatus, FloorTone> = {
  free: 'free',
  seated: 'occupied',
  ordered: 'occupied',
  waiting_to_pay: 'paying',
  needs_waiter: 'calling',
};

/** The tones in the order the room bar and its key show them, calm to urgent. */
export const TONES: readonly FloorTone[] = ['free', 'occupied', 'paying', 'calling'];

/** The i18n key for each status word, so a tile never rests on colour alone. */
export const STATUS_LABEL: Record<FloorStatus, string> = {
  free: 'owner.free',
  seated: 'owner.seated',
  ordered: 'owner.ordered',
  waiting_to_pay: 'owner.waitingPay',
  needs_waiter: 'owner.needsWaiter',
};
