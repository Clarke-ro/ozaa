import { ApiError, OfflineError } from '@/lib/api/errors';
import { loginError } from './loginError';

describe('loginError', () => {
  it('names the problem the person can act on', () => {
    expect(loginError(new ApiError(401, 'bad_code', 'x'), 'code').message).toBe('errors.badCode');
    expect(loginError(new ApiError(429, 'rate_limited', 'x'), 'send').message).toBe(
      'errors.rateLimited',
    );
    expect(loginError(new ApiError(403, 'not_staff', 'x'), 'me').message).toBe(
      'owner.err.notStaff',
    );
    expect(loginError(new ApiError(503, 'auth_unavailable', 'x'), 'send').message).toBe(
      'owner.err.unavailable',
    );
    expect(loginError(new ApiError(503, 'sign_in_not_ready', 'x'), 'me').message).toBe(
      'owner.err.unavailable',
    );
  });

  it('treats a request that never got an answer as no connection', () => {
    // Chrome says "Failed to fetch", Safari "Load failed": both are TypeErrors from fetch.
    expect(loginError(new TypeError('Load failed'), 'me').message).toBe('owner.err.unreachable');
    expect(loginError(new OfflineError(), 'me').message).toBe('owner.err.unreachable');
  });

  it('keeps a short reference for anything else, with the step and the reason', () => {
    expect(loginError(new ApiError(500, 'internal', 'x'), 'me')).toEqual({
      message: 'errors.generic',
      ref: 'me-500-internal',
    });
    expect(loginError(new Error('no token'), 'token').ref).toBe('token-no-token');
  });
});
