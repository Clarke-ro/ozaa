import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@/i18n';
import { FeePassingCard } from './FeePassingCard';

// Icons draw nothing here.
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
// The kit's animated pieces need native code; plain stand-ins with the same roles and labels.
jest.mock('../../kit', () => {
  const { Pressable, Text } = jest.requireActual('react-native');
  return {
    cardStyle: () => ({}),
    toast: { success: jest.fn(), error: jest.fn() },
    Toggle: ({
      value,
      label,
      onChange,
    }: {
      value: boolean;
      label: string;
      onChange: (v: boolean) => void;
    }) => (
      <Pressable
        accessibilityRole="switch"
        accessibilityLabel={label}
        accessibilityState={{ checked: value }}
        onPress={() => onChange(!value)}
      />
    ),
    Chips: ({
      options,
      onChange,
    }: {
      options: { id: string; label: string }[];
      onChange: (ids: string[]) => void;
    }) =>
      options.map((option) => (
        <Pressable
          key={option.id}
          accessibilityRole="radio"
          accessibilityLabel={option.label}
          onPress={() => onChange([option.id])}
        >
          <Text>{option.label}</Text>
        </Pressable>
      )),
  };
});
const mockSave = jest.fn((_venueId: string, body: unknown) =>
  Promise.resolve({ feePassing: body }),
);
jest.mock('@/lib/api', () => ({
  api: { ownerSetFeePassing: (venueId: string, body: unknown) => mockSave(venueId, body) },
}));

// A venue that has never set fee passing has no feePassing in its settings (the real server
// leaves it out). Turning the switch on used to close the card at once, so no share could be
// picked: only picking a share should close it.
test('turning fee passing on keeps the shares open until one is picked', async () => {
  // No clean-up timers: a saved mutation otherwise keeps Jest running for five minutes.
  const client = new QueryClient({
    defaultOptions: { queries: { gcTime: Infinity }, mutations: { gcTime: Infinity } },
  });
  const view = await render(
    <QueryClientProvider client={client}>
      <FeePassingCard venueId="ven_bean" settings={{ manual: [] } as never} />
    </QueryClientProvider>,
  );
  await act(async () => {
    fireEvent(screen.getByRole('switch', { name: 'Pass fees to customers' }), 'press');
  });
  expect(mockSave).toHaveBeenCalledWith('ven_bean', { enabled: true, percent: 100 });
  expect(screen.getByRole('radio', { name: '50%' })).toBeTruthy();

  await act(async () => {
    fireEvent.press(screen.getByRole('radio', { name: '50%' }));
  });
  expect(mockSave).toHaveBeenLastCalledWith('ven_bean', { enabled: true, percent: 50 });
  expect(screen.queryByRole('radio', { name: '50%' })).toBeNull();
  view.unmount();
  client.clear();
});
