import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useOwnerSession } from '@/features/session';
import { ownerKeys } from './keys';
import { useOwnerPrefs } from './ownerPrefs';
import { useArrivalChime } from './useArrivalChime';

const mockPlayer = { play: jest.fn(), seekTo: jest.fn(() => Promise.resolve()) };
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-audio', () => ({ useAudioPlayer: () => mockPlayer }));
jest.mock('@/lib/api', () => ({
  api: {
    ownerListOrders: jest.fn(() => Promise.resolve({ items: [{ id: 'o1' }] })),
    ownerListWaiterCalls: jest.fn(() => Promise.resolve({ items: [] })),
  },
}));

async function setup(role: 'owner' | 'kitchen') {
  useOwnerSession.setState({ venueId: 'ven_1', role });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const hook = await renderHook(() => useArrivalChime(), { wrapper });
  cleanups.push(() => {
    hook.unmount();
    client.clear();
  });
  return client;
}

const cleanups: (() => void)[] = [];

beforeEach(async () => {
  mockPlayer.play.mockClear();
  // Let the saved setting load first, so it can't overwrite what a test sets.
  await useOwnerPrefs.persist.rehydrate();
  useOwnerPrefs.setState({ chime: true });
});

afterEach(() => {
  while (cleanups.length) cleanups.pop()?.();
});

test('rings for a new order after the first load, not for the orders already there', async () => {
  const client = await setup('owner');
  await waitFor(() => expect(client.getQueryData(ownerKeys.orders('ven_1'))).toBeTruthy());
  // Let the hook take in the first load before anything new arrives.
  await act(async () => {});
  expect(mockPlayer.play).not.toHaveBeenCalled();
  await act(() =>
    client.setQueryData(ownerKeys.orders('ven_1'), { items: [{ id: 'o1' }, { id: 'o2' }] }),
  );
  await waitFor(() => expect(mockPlayer.play).toHaveBeenCalledTimes(1));
});

test('rings for a new waiter call, but the kitchen never hears calls', async () => {
  const owner = await setup('owner');
  await waitFor(() => expect(owner.getQueryData(ownerKeys.calls('ven_1'))).toBeTruthy());
  // Let the hook take in the first load before anything new arrives.
  await act(async () => {});
  await act(() =>
    owner.setQueryData(ownerKeys.calls('ven_1'), { items: [{ id: 'c1', status: 'open' }] }),
  );
  await waitFor(() => expect(mockPlayer.play).toHaveBeenCalledTimes(1));

  mockPlayer.play.mockClear();
  const kitchen = await setup('kitchen');
  await waitFor(() => expect(kitchen.getQueryData(ownerKeys.orders('ven_1'))).toBeTruthy());
  // Let the hook take in the first load before anything new arrives.
  await act(async () => {});
  await act(() =>
    kitchen.setQueryData(ownerKeys.calls('ven_1'), { items: [{ id: 'c2', status: 'open' }] }),
  );
  await act(() => kitchen.setQueryData(ownerKeys.orders('ven_1'), { items: [{ id: 'o1' }] }));
  expect(mockPlayer.play).not.toHaveBeenCalled();
});

test('stays quiet when the owner turned the sound off', async () => {
  useOwnerPrefs.setState({ chime: false });
  const client = await setup('owner');
  await waitFor(() => expect(client.getQueryData(ownerKeys.orders('ven_1'))).toBeTruthy());
  // Let the hook take in the first load before anything new arrives.
  await act(async () => {});
  await act(() =>
    client.setQueryData(ownerKeys.orders('ven_1'), { items: [{ id: 'o1' }, { id: 'o9' }] }),
  );
  expect(mockPlayer.play).not.toHaveBeenCalled();
});
