import { act, render, waitFor } from '@testing-library/react-native';
import { useGuestSession } from '@/features/session';
import { TableEntryScreen } from './TableEntryScreen';

// The guest visit is saved in the phone's keychain; in tests, keep it in memory.
jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: (key: string) => Promise.resolve(store.get(key) ?? null),
    setItemAsync: (key: string, value: string) => Promise.resolve(void store.set(key, value)),
    deleteItemAsync: (key: string) => Promise.resolve(void store.delete(key)),
  };
});
const mockCreate = jest.fn((_body: unknown) =>
  Promise.resolve({
    guestToken: 'gst_new',
    expiresAt: '',
    venue: {},
    table: { id: 't', code: '12' },
  }),
);
jest.mock('@/lib/api', () => ({
  api: { createGuestSession: (body: unknown) => mockCreate(body) },
  setGuestToken: jest.fn(),
  setAccessToken: jest.fn(),
  setLoyaltyToken: jest.fn(),
  setOnUnauthorized: jest.fn(),
  setOnGuestUnauthorized: jest.fn(),
  ownerAuth: { getToken: jest.fn() },
}));
jest.mock('@/mocks/openOrder', () => ({ peekOpenOrder: () => null }));
jest.mock('./HomeScreen', () => ({ HomeScreen: () => null }));
jest.mock('@/ui/states', () => ({ ErrorState: () => null, LoadingState: () => null }));
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: jest.fn() }) }));

beforeEach(() => mockCreate.mockClear());

// On phones the saved visit loads a moment after start. If the table page saved its table first,
// the old saved visit (no table) overwrote it, and the order screen said "orders at the table only".
test('a table scan waits for the saved visit, then the table sticks', async () => {
  useGuestSession.setState({
    hydrated: false,
    token: null,
    slug: null,
    tableCode: null,
    orderId: null,
  });
  render(<TableEntryScreen slug="mamas-kitchen" table="12" />);
  await act(async () => {
    await Promise.resolve();
  });
  expect(mockCreate).not.toHaveBeenCalled();

  // The old visit arrives from storage: a link visit with no table.
  act(() =>
    useGuestSession.setState({
      hydrated: true,
      slug: 'mamas-kitchen',
      tableCode: null,
      token: 'gst_old',
    }),
  );
  await waitFor(() =>
    expect(mockCreate).toHaveBeenCalledWith({ venueSlug: 'mamas-kitchen', tableCode: '12' }),
  );
  await waitFor(() => expect(useGuestSession.getState().tableCode).toBe('12'));
  expect(useGuestSession.getState().token).toBe('gst_new');
});
