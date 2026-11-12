import type { WaiterCall } from '@/lib/api/types';
import { waiterTransition } from './waiterCallMachine';

export type CallUpdate = {
  status?: 'acknowledged' | 'resolved';
  reply?: string;
  snoozeMinutes?: number;
};

/**
 * One staff action on a call. "On my way" acknowledges; a reply resolves (the guest reads it);
 * a snooze only hides the call from the queue for a few minutes. Null when the move isn't allowed.
 */
export function applyCallUpdate(
  call: WaiterCall,
  update: CallUpdate,
  staffFirstName: string,
  now: number,
): WaiterCall | null {
  const at = new Date(now).toISOString();
  if (update.snoozeMinutes !== undefined) {
    if (call.status === 'resolved') return null;
    return { ...call, snoozedUntil: new Date(now + update.snoozeMinutes * 60_000).toISOString() };
  }
  const reply = update.reply?.trim();
  const move =
    reply || update.status === 'resolved' ? 'resolve' : update.status ? 'acknowledge' : null;
  const next = move ? waiterTransition(call.status, move) : null;
  if (!next) return null;
  if (next === 'acknowledged') {
    return { ...call, status: next, staffFirstName, acknowledgedAt: at, snoozedUntil: null };
  }
  return {
    ...call,
    status: next,
    staffFirstName: call.staffFirstName ?? staffFirstName,
    resolvedAt: at,
    snoozedUntil: null,
    ...(reply ? { reply, repliedAt: at, staffFirstName } : {}),
  };
}

/** Still in the owner's queue: not finished and not snoozed right now. */
export function isInQueue(call: WaiterCall, now: number): boolean {
  if (call.status === 'resolved') return false;
  return !call.snoozedUntil || Date.parse(call.snoozedUntil) <= now;
}
