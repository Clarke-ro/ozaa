import { MESSAGES, OfflineError, toMessageKey } from './errors';

describe('toMessageKey', () => {
  it('asks the guest to reconnect when a send fails offline', () => {
    expect(toMessageKey(new OfflineError())).toBe('errors.offlineRetry');
  });

  it('falls back to the generic message for anything unknown', () => {
    expect(toMessageKey(new Error('boom'))).toBe('errors.generic');
  });
});

describe('every error message exists in English', () => {
  // A missing one shows the raw key on screen ("errors.unauthorized"), which a guest saw once.
  const en = require('@/i18n/locales/en.json') as Record<string, unknown>;
  const lookup = (key: string) =>
    key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], en);
  it.each(Object.entries(MESSAGES))('%s → %s', (_code, key) => {
    expect(typeof lookup(key)).toBe('string');
  });
});
