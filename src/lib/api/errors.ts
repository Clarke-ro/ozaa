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
  not_modified: 'errors.notModified',
  unauthorized: 'errors.unauthorized',
  bad_code: 'errors.badCode',
};

export function toMessageKey(error: unknown): string {
  if (error instanceof OfflineError) return 'errors.offline';
  if (error instanceof ApiError) return MESSAGES[error.code] ?? 'errors.generic';
  return 'errors.generic';
}
