import { MESSAGES, OfflineError, toMessageKey } from './errors';

describe('toMessageKey', () => {
  it('asks the guest to reconnect when a send fails offline', () => {
    expect(toMessageKey(new OfflineError())).toBe('errors.offlineRetry');
  });

  it('falls back to the generic message for anything unknown', () => {
    expect(toMessageKey(new Error('boom'))).toBe('errors.generic');
  });
});

describe('guest menu text exists in English', () => {
  // These were once added to the wrong block in en.json and showed as raw keys.
  const en = require('@/i18n/locales/en.json') as { menu: Record<string, unknown> };
  it.each(['offersTitle', 'searchAll', 'allSections'])('menu.%s', (key) => {
    expect(typeof en.menu[key]).toBe('string');
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
