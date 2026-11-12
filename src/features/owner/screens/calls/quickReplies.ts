import type { WaiterReason } from '@/lib/api/types';

/** Replies offered for a call: two general ones, then one that fits what the guest asked for. */
export function quickReplies(reason: WaiterReason): string[] {
  const fitting = reason === 'other' ? [] : [reason];
  return ['now', 'twoMin', ...fitting];
}
