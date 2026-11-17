import { readEnv } from './env';

describe('readEnv', () => {
  it('falls back to mock mode and the defaults when nothing is set', () => {
    expect(readEnv({})).toEqual({
      EXPO_PUBLIC_API_MODE: 'mock',
      EXPO_PUBLIC_API_URL: 'http://localhost:4000/v1',
      EXPO_PUBLIC_MOCK_LATENCY_MS: 400,
      EXPO_PUBLIC_SENTRY_DSN: '',
      EXPO_PUBLIC_MOCK_FAIL_RATE: 0,
      EXPO_PUBLIC_MOCK_FAST: '0',
      EXPO_PUBLIC_SITE_URL: 'https://cravins.app',
      EXPO_PUBLIC_MAP_TILES: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      EXPO_PUBLIC_SUPPORT_EMAIL: 'support@cravins.app',
      EXPO_PUBLIC_SUPPORT_WHATSAPP: '233200000000',
      EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: '',
      EXPO_PUBLIC_DEMO_URL: '',
    });
  });

  it('turns numbers from strings into numbers', () => {
    const env = readEnv({
      EXPO_PUBLIC_MOCK_LATENCY_MS: '50',
      EXPO_PUBLIC_MOCK_FAIL_RATE: '0.2',
    });
    expect(env.EXPO_PUBLIC_MOCK_LATENCY_MS).toBe(50);
    expect(env.EXPO_PUBLIC_MOCK_FAIL_RATE).toBe(0.2);
  });

  it('refuses a fail rate outside 0 to 1 and an unknown mode', () => {
    expect(() => readEnv({ EXPO_PUBLIC_MOCK_FAIL_RATE: '2' })).toThrow();
    expect(() => readEnv({ EXPO_PUBLIC_API_MODE: 'live' })).toThrow();
    expect(() => readEnv({ EXPO_PUBLIC_SITE_URL: 'cravins' })).toThrow();
  });
});

describe('the API address for a real-server build', () => {
  it('must be a URL', () => {
    expect(() =>
      readEnv({ EXPO_PUBLIC_API_MODE: 'http', EXPO_PUBLIC_API_URL: 'api' }, false),
    ).toThrow();
  });
  it('may be localhost while developing', () => {
    expect(readEnv({ EXPO_PUBLIC_API_MODE: 'http' }, false).EXPO_PUBLIC_API_URL).toBe(
      'http://localhost:4000/v1',
    );
  });
  it('must be https, and not localhost, in a production build', () => {
    expect(() => readEnv({ EXPO_PUBLIC_API_MODE: 'http' }, true)).toThrow(/EXPO_PUBLIC_API_URL/);
    expect(() =>
      readEnv(
        { EXPO_PUBLIC_API_MODE: 'http', EXPO_PUBLIC_API_URL: 'http://api.cravins.app/v1' },
        true,
      ),
    ).toThrow(/https/);
    expect(
      readEnv(
        { EXPO_PUBLIC_API_MODE: 'http', EXPO_PUBLIC_API_URL: 'https://api.cravins.app/v1' },
        true,
      ).EXPO_PUBLIC_API_URL,
    ).toBe('https://api.cravins.app/v1');
  });
  it('is not checked in a mock build, which never calls it', () => {
    expect(() => readEnv({}, true)).not.toThrow();
  });
});
