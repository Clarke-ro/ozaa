import { OfflineError } from '@/lib/api/errors';
import { ownerRefresher } from './ownerRefresh';

function setup(fresh: () => Promise<string | null>) {
  const saved: string[] = [];
  let signedOut = false;
  const run = ownerRefresher({
    freshToken: jest.fn(fresh),
    save: (token) => saved.push(token),
    signOut: () => {
      signedOut = true;
    },
  });
  return { run, saved, signedOut: () => signedOut };
}

test('a live sign-in gets a new token, saved', async () => {
  const s = setup(async () => 'tok_2');
  await expect(s.run()).resolves.toBe(true);
  expect(s.saved).toEqual(['tok_2']);
  expect(s.signedOut()).toBe(false);
});

test('many calls failing together ask once', async () => {
  let calls = 0;
  const s = setup(async () => {
    calls += 1;
    return 'tok_2';
  });
  await Promise.all([s.run(), s.run(), s.run()]);
  expect(calls).toBe(1);
});

test('an ended sign-in (no token) signs the owner out', async () => {
  const s = setup(async () => null);
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
