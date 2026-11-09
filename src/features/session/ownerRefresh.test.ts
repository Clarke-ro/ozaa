import { ApiError, OfflineError } from '@/lib/api/errors';
import type { AuthTokens } from '@/lib/api/types';
import { ownerRefresher } from './ownerRefresh';

const fresh = { accessToken: 'acc_2', refreshToken: 'rfr_2' } as AuthTokens;

function setup(refresh: () => Promise<AuthTokens>, refreshToken: string | null = 'rfr_1') {
  const saved: string[] = [];
  let signedOut = false;
  const run = ownerRefresher({
    refreshToken: () => refreshToken,
    refresh: jest.fn(refresh),
    save: (tokens) => saved.push(tokens.accessToken),
    signOut: () => {
      signedOut = true;
    },
  });
  return { run, saved, signedOut: () => signedOut };
}

test('a good refresh token gets a new access token, saved', async () => {
  const s = setup(async () => fresh);
  await expect(s.run()).resolves.toBe(true);
  expect(s.saved).toEqual(['acc_2']);
  expect(s.signedOut()).toBe(false);
});

test('many calls failing together refresh once', async () => {
  let calls = 0;
  const s = setup(async () => {
    calls += 1;
    return fresh;
  });
  await Promise.all([s.run(), s.run(), s.run()]);
  expect(calls).toBe(1);
});

test('a refused refresh token signs the owner out', async () => {
  const s = setup(async () => {
    throw new ApiError(401, 'unauthorized', 'Sign in again');
  });
  await expect(s.run()).resolves.toBe(false);
  expect(s.signedOut()).toBe(true);
});

test('no refresh token signs the owner out without calling the server', async () => {
  const s = setup(async () => fresh, null);
  await expect(s.run()).resolves.toBe(false);
  expect(s.signedOut()).toBe(true);
});

test('offline keeps the owner signed in, to try again later', async () => {
  const s = setup(async () => {
    throw new OfflineError();
  });
  await expect(s.run()).resolves.toBe(false);
  expect(s.signedOut()).toBe(false);
});
