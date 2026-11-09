import { Redirect, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { Button } from '@/ui/Button';
import { env } from '@/lib/env';
import { decideMockCard } from '@/mocks/mockClient';
export default function MockCheckout() {
  const { ref } = useLocalSearchParams<{ ref?: string }>();
  const reference = ref ?? '';
  // A stand-in for the Paystack card page, so it only exists while the app runs on the mock.
  if (env.EXPO_PUBLIC_API_MODE !== 'mock') return <Redirect href="/" />;
  return (
    <View
      style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 12, backgroundColor: '#fff' }}
    >
      <Button label="Pay" onPress={() => decideMockCard(reference, 'succeeded')} />
      <Button
        label="Cancel"
        tone="secondary"
        onPress={() => decideMockCard(reference, 'abandoned')}
      />
    </View>
  );
}
