import { readEnv } from './env';

describe('readEnv', () => {
  it('falls back to mock mode and the defaults when nothing is set', () => {
    expect(readEnv({})).toEqual({
      EXPO_PUBLIC_API_MODE: 'mock',
      EXPO_PUBLIC_API_URL: 'http://localhost:4000/v1',
      EXPO_PUBLIC_API_LIVE: '',
      EXPO_PUBLIC_MOCK_LATENCY_MS: 400,
      EXPO_PUBLIC_MOCK_FAIL_RATE: 0,
      EXPO_PUBLIC_MOCK_FAST: '0',
      EXPO_PUBLIC_SITE_URL: 'https://cravins.app',
      EXPO_PUBLIC_MAP_TILES: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      EXPO_PUBLIC_SUPPORT_EMAIL: '',
      EXPO_PUBLIC_SUPPORT_WHATSAPP: '',
      live: [],
    });
  });

  it('turns numbers from strings into numbers and splits the live list', () => {
    const env = readEnv({
      EXPO_PUBLIC_MOCK_LATENCY_MS: '50',
      EXPO_PUBLIC_MOCK_FAIL_RATE: '0.2',
      EXPO_PUBLIC_API_LIVE: 'payments, menu',
    });
    expect(env.EXPO_PUBLIC_MOCK_LATENCY_MS).toBe(50);
    expect(env.EXPO_PUBLIC_MOCK_FAIL_RATE).toBe(0.2);
    expect(env.live).toEqual(['payments', 'menu']);
  });

  it('refuses a fail rate outside 0 to 1 and an unknown mode', () => {
    expect(() => readEnv({ EXPO_PUBLIC_MOCK_FAIL_RATE: '2' })).toThrow();
    expect(() => readEnv({ EXPO_PUBLIC_API_MODE: 'live' })).toThrow();
    expect(() => readEnv({ EXPO_PUBLIC_SITE_URL: 'cravins' })).toThrow();
  });
});
