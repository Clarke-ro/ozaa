import { ApiError, OfflineError } from '@/lib/api/errors';

/** Where sign-in was when it failed: sending the code, checking it, Clerk's token, or the server's /me. */
export type LoginStep = 'send' | 'code' | 'token' | 'me';

/**
 * The words to show when sign-in fails, and a short reference such as "me-500-internal". The
 * reference is small print under the message so a person can read it out to support: before
 * this, every failure said "Something went wrong" and nobody could tell which step broke.
 */
export function loginError(error: unknown, step: LoginStep): { message: string; ref: string } {
  const ref = `${step}-${reason(error)}`;
  if (error instanceof OfflineError || error instanceof TypeError) {
    return { message: 'owner.err.unreachable', ref };
  }
  if (error instanceof ApiError) {
    if (error.code === 'bad_code') return { message: 'errors.badCode', ref };
    if (error.status === 429) return { message: 'errors.rateLimited', ref };
    if (error.code === 'not_staff') return { message: 'owner.err.notStaff', ref };
    if (error.status === 503) return { message: 'owner.err.unavailable', ref };
  }
  return { message: 'errors.generic', ref };
}

function reason(error: unknown): string {
  if (error instanceof ApiError) return `${error.status}-${error.code}`;
  if (error instanceof Error)
    return error.message
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, 30);
  return 'unknown';
}
