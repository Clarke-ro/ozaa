import { OfflineError, toMessageKey } from './errors';

describe('toMessageKey', () => {
  it('asks the guest to reconnect when a send fails offline', () => {
    expect(toMessageKey(new OfflineError())).toBe('errors.offlineRetry');
  });

  it('falls back to the generic message for anything unknown', () => {
    expect(toMessageKey(new Error('boom'))).toBe('errors.generic');
  });
});
