const ATTEMPTS = 8;

type ErrorRecord = {
  code?: unknown;
  constraint?: unknown;
  constraint_name?: unknown;
  message?: unknown;
  cause?: unknown;
};

function recordOf(error: unknown): ErrorRecord | null {
  if (!error || typeof error !== 'object') return null;
  return error as ErrorRecord;
}

/**
 * True when Postgres rejected the insert because this venue already used that number today.
 * Drizzle wraps the database error, so the code may sit on `cause`.
 */
export function isDailyNumberCollision(error: unknown): boolean {
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current && !seen.has(current)) {
    seen.add(current);
    const record = recordOf(current);
    if (!record) return false;
    const constraint =
      typeof record.constraint === 'string'
        ? record.constraint
        : typeof record.constraint_name === 'string'
          ? record.constraint_name
          : '';
    const message = typeof record.message === 'string' ? record.message : '';
    if (record.code === '23505' && (constraint === 'orders_daily_number' || message.includes('orders_daily_number'))) {
      return true;
    }
    current = record.cause;
  }
  return false;
}

/** Runs the insert again when the daily number was taken. Any other error is rethrown. */
export async function retryOnDailyNumberCollision<T>(save: () => Promise<T>): Promise<T> {
  let last: unknown;
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    try {
      return await save();
    } catch (error) {
      last = error;
      if (!isDailyNumberCollision(error)) throw error;
    }
  }
  throw last;
}
