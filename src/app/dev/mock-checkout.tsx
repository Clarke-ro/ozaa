import { Redirect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { View } from 'react-native';
import { Button } from '@/ui/Button';
import { env } from '@/lib/env';
import { decideMockCard } from '@/mocks/mockClient';

export default function MockCheckout() {
  const router = useRouter();
  const { ref, back } = useLocalSearchParams<{ ref?: string; back?: string }>();
  const reference = ref ?? '';
  // A stand-in for the Paystack card page, so it only exists while the app runs on the mock.
  if (env.EXPO_PUBLIC_API_MODE !== 'mock') return <Redirect href="/" />;

  // Like Paystack's callback: back to the venue's pay page with the reference added. Only a path
  // on this app ("/x", never "//other.site") is followed.
  const finish = (result: 'succeeded' | 'abandoned') => {
    decideMockCard(reference, result);
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
