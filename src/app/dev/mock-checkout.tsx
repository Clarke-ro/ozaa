import { Redirect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { View } from 'react-native';
import { Button } from '@/ui/Button';
import { env } from '@/lib/env';

// Loaded only in a mock build, like src/lib/api/index.ts: a real-server build drops the mock.
const mocks =
  process.env.EXPO_PUBLIC_API_MODE === 'http'
    ? null
    : // eslint-disable-next-line @typescript-eslint/no-require-imports -- see the note above
      (require('@/mocks/mockClient') as typeof import('@/mocks/mockClient'));

export default function MockCheckout() {
  const router = useRouter();
  const { ref, back } = useLocalSearchParams<{ ref?: string; back?: string }>();
  const reference = ref ?? '';
  // A stand-in for the Paystack checkout page (card, and MoMo without a phone), so it only exists while the app runs on the mock.
  if (env.EXPO_PUBLIC_API_MODE !== 'mock' || !mocks) return <Redirect href="/" />;

  // Like Paystack's callback: back to the venue's pay page with the reference added. Only a path
  // on this app ("/x", never "//other.site") is followed.
  const finish = (result: 'succeeded' | 'abandoned') => {
    mocks?.decideMockCard(reference, result);
    const path = back && back.startsWith('/') && !back.startsWith('//') ? back : '/';
    router.replace(`${path}?reference=${reference}&trxref=${reference}` as Href);
  };

  return (
    <View
      style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 12, backgroundColor: '#fff' }}
    >
      <Button label="Pay" onPress={() => finish('succeeded')} />
      <Button label="Cancel" tone="secondary" onPress={() => finish('abandoned')} />
    </View>
  );
}
