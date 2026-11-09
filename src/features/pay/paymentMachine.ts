/**
 * Guest-side steps around one Paystack attempt.
 * Only a server status of succeeded counts as paid. A finished countdown
 * moves to "checking" and waits for verify, so a late approval is not shown as failed.
 */
export type PayUiState =
  | { kind: 'choosing' }
  | { kind: 'quoting' }
  | { kind: 'confirming' }
  | { kind: 'starting' }
  | { kind: 'awaiting_approval'; reference: string; approveBy: number }
  | { kind: 'opening_checkout'; reference: string; url: string }
  | { kind: 'checking'; reference: string }
  | { kind: 'paid'; reference: string }
  | { kind: 'failed'; message: string }
  | { kind: 'timed_out' };

export type PayUiEvent =
  | { type: 'request_quote' }
  | { type: 'quote_ready' }
  | { type: 'confirm' }
  | { type: 'momo_started'; reference: string; approveBy: number }
  | { type: 'card_started'; reference: string; url: string }
  | { type: 'start_rejected'; message: string }
  | { type: 'server_succeeded'; reference: string }
  | { type: 'server_failed'; message: string }
  | { type: 'countdown_done' }
  | { type: 'returned_from_checkout' }
  | { type: 'resume_check'; reference: string }
  | { type: 'verify_still_open' }
  | { type: 'reset' };

export const payInitial: PayUiState = { kind: 'choosing' };

export function payTransition(state: PayUiState, event: PayUiEvent): PayUiState {
  if (
    event.type === 'reset' &&
    (state.kind === 'failed' || state.kind === 'timed_out' || state.kind === 'paid')
  ) {
    return payInitial;
  }
  switch (state.kind) {
    case 'choosing':
      if (event.type === 'resume_check') return { kind: 'checking', reference: event.reference };
      return event.type === 'request_quote' ? { kind: 'quoting' } : state;
    case 'quoting':
      return event.type === 'quote_ready' ? { kind: 'confirming' } : state;
    case 'confirming':
      return event.type === 'confirm' ? { kind: 'starting' } : state;
    case 'starting':
      if (event.type === 'momo_started') {
        return {
          kind: 'awaiting_approval',
          reference: event.reference,
          approveBy: event.approveBy,
        };
      }
      if (event.type === 'card_started') {
        return { kind: 'opening_checkout', reference: event.reference, url: event.url };
      }
      if (event.type === 'start_rejected') return { kind: 'failed', message: event.message };
      return state;
    case 'awaiting_approval':
      if (event.type === 'server_succeeded') return { kind: 'paid', reference: event.reference };
      if (event.type === 'server_failed') return { kind: 'failed', message: event.message };
      if (event.type === 'countdown_done') return { kind: 'checking', reference: state.reference };
      return state;
    case 'opening_checkout':
      return event.type === 'returned_from_checkout'
        ? { kind: 'checking', reference: state.reference }
        : state;
    case 'checking':
      if (event.type === 'server_succeeded') return { kind: 'paid', reference: event.reference };
      if (event.type === 'server_failed') return { kind: 'failed', message: event.message };
      if (event.type === 'verify_still_open') return { kind: 'timed_out' };
      return state;
    default:
      return state;
  }
}
