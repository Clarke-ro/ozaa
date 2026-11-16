import createClient from 'openapi-fetch';
import type { paths } from './schema';
import type { TokenSource } from './client';
import { ApiError } from './errors';
import type { Call } from './types';

/** Turns a Problem Details body (or anything else) into an ApiError. */
export function problem(error: unknown, status: number): ApiError {
  if (typeof error === 'object' && error !== null && 'title' in error && 'status' in error) {
    const body = error as { title?: unknown; status?: unknown; code?: unknown; detail?: unknown };
    const title = typeof body.title === 'string' ? body.title : 'Something went wrong';
    const code = typeof body.code === 'string' ? body.code : 'request_failed';
    const detail = typeof body.detail === 'string' ? body.detail : undefined;
    const httpStatus = typeof body.status === 'number' ? body.status : status;
    return new ApiError(httpStatus, code, title, detail);
  }
  return new ApiError(status, 'request_failed', 'Something went wrong');
}

/** What every call to the real server shares: the typed fetch client, the headers and ok(). */
export type HttpContext = ReturnType<typeof createHttpContext>;

export function createHttpContext(baseUrl: string, tokens: TokenSource) {
  const client = createClient<paths>({ baseUrl });
  const headers = (kind: 'guest' | 'access' | 'loyalty', call?: Call) => {
    const token =
      kind === 'guest'
        ? tokens.guest()
        : kind === 'loyalty'
          ? (tokens.loyalty?.() ?? tokens.access())
          : tokens.access();
    const value: Record<string, string> = {};
    if (token) value.Authorization = `Bearer ${token}`;
    if (call?.idempotencyKey) value['Idempotency-Key'] = call.idempotencyKey;
    if (call?.ifNoneMatch) value['If-None-Match'] = call.ifNoneMatch;
    if (call?.deleteToken) value['X-Delete-Token'] = call.deleteToken;
    return value;
  };

  async function ok<T>(
    pending: Promise<{ data?: T; error?: unknown; response: Response }>,
  ): Promise<T> {
    const result = await pending;
    if (result.response.status === 304) throw new ApiError(304, 'not_modified', 'Not modified');
    if (result.data === undefined) throw problem(result.error, result.response.status);
    return result.data;
  }

  return { client, headers, ok };
}
