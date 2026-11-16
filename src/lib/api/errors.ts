export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly title: string,
    readonly detail?: string,
  ) {
    super(title);
  }
}

export class OfflineError extends Error {
  constructor() {
    super('offline');
  }
}

const MESSAGES: Record<string, string> = {
  venue_not_found: 'errors.venueNotFound',
  order_not_found: 'errors.orderNotFound',
  payment_declined: 'errors.paymentDeclined',
  rate_limited: 'errors.rateLimited',
  item_sold_out: 'errors.soldOut',
  quantity_out_of_range: 'errors.quantityRange',
  venue_not_published: 'errors.notPublished',
  online_ordering_off: 'linkOrder.err.unavailable',
  method_off: 'linkOrder.err.unavailable',
  missing_contact: 'linkOrder.err.name',
  missing_address: 'linkOrder.err.address',
  missing_location: 'linkOrder.err.location',
  no_venue_location: 'linkOrder.err.unavailable',
  too_far: 'linkOrder.err.tooFarShort',
  paystack_keys_invalid: 'ownerPay.err.paystack_keys_invalid',
  paystack_mode_mismatch: 'ownerPay.err.paystack_mode_mismatch',
  live_not_enabled: 'ownerPay.err.live_not_enabled',
  online_pay_off: 'status.payAtCounter',
  manual_bank_incomplete: 'ownerPay.err.bank',
  manual_momo_incomplete: 'ownerPay.err.momo',
  forbidden: 'errors.forbidden',
  not_modified: 'errors.notModified',
  unauthorized: 'errors.unauthorized',
  bad_code: 'errors.badCode',
};

export function toMessageKey(error: unknown): string {
  // Not errors.offline: that line is for showing saved data, and a failed send shows none.
  if (error instanceof OfflineError) return 'errors.offlineRetry';
  if (error instanceof ApiError) return MESSAGES[error.code] ?? 'errors.generic';
  return 'errors.generic';
}
