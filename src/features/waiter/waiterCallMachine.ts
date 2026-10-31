export type WaiterStatus = 'open' | 'acknowledged' | 'resolved';
export type WaiterMove = 'acknowledge' | 'resolve';

export function waiterTransition(status: WaiterStatus, move: WaiterMove): WaiterStatus | null {
  if (status === 'open' && move === 'acknowledge') return 'acknowledged';
  if ((status === 'open' || status === 'acknowledged') && move === 'resolve') return 'resolved';
  return null;
}
